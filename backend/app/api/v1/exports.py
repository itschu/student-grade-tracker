from flask import Blueprint, request, g, Response, render_template, jsonify
import io
import csv
from datetime import datetime

from app import db
from app.models import (
    Course,
    Term,
    Enrollment,
    Assignment,
    Grade,
    User,
)
from app.utils.auth import require_auth, require_role, assert_teacher_owns_course
from app.services.grade_calculator import (
    compute_final_grade,
    get_effective_config,
    convert_to_display,
)
from sqlalchemy import func, and_, true


exports_bp = Blueprint("exports_bp", __name__, url_prefix="/api/v1/exports")


@exports_bp.route("/gradebook", methods=["GET"])
@require_auth
@require_role("admin", "teacher")
def gradebook():
    course_id = request.args.get("course_id")
    fmt = request.args.get("format")

    if not course_id or not fmt or fmt not in ("csv", "pdf"):
        return jsonify({"error": "course_id and valid format (csv or pdf) are required"}), 400

    course = Course.query.get(course_id)
    if course is None:
        return jsonify({"error": "Course not found"}), 404

    term = Term.query.get(course.term_id) if course.term_id else None

    if g.current_user and g.current_user.role.value == "teacher":
        assert_teacher_owns_course(str(g.current_user.id), course_id)

    students = (
        User.query.join(Enrollment, User.id == Enrollment.student_id)
        .filter(Enrollment.course_id == course_id)
        .order_by(User.full_name)
        .all()
    )
    assignments = (
        Assignment.query.filter_by(course_id=course_id)
        .order_by(Assignment.created_at)
        .all()
    )

    if len(students) > 30 or len(assignments) > 30:
        return (
            jsonify({
                "error": "Export too large. Maximum 30 students and 30 assignments per export."
            }),
            422,
        )

    # build score matrix
    score_rows = (
        db.session.query(
            Enrollment.student_id,
            Assignment.id.label("assignment_id"),
            func.coalesce(Grade.earned_points, 0).label("score"),
        )
        .select_from(Enrollment)
        .join(Assignment, true())
        .outerjoin(
            Grade,
            and_(Grade.assignment_id == Assignment.id, Grade.student_id == Enrollment.student_id),
        )
        .filter(
            Enrollment.course_id == course_id,
            Assignment.course_id == course_id,
        )
        .all()
    )

    # pivot into dictionary, normalize ids to strings
    scores = {}
    for student_id, assignment_id, score in score_rows:
        sid = str(student_id)
        aid = str(assignment_id)
        scores.setdefault(sid, {})[aid] = float(score)

    rows = []
    config = get_effective_config(str(course.term_id)) if course.term_id else None

    for student in students:
        final_pct = compute_final_grade(course_id, str(student.id))
        display = (
            convert_to_display(final_pct, config) if config else f"{final_pct:.1f}%"
        )
        rows.append(
            {
                "full_name": student.full_name,
                "student_id": str(student.id),
                "final_pct": final_pct,
                "display_grade": display,
            }
        )

    if fmt == "csv":
        buf = io.StringIO()
        writer = csv.writer(buf)
        header = ["Student Name"] + [a.name for a in assignments] + ["Final Grade %", "Display Grade"]
        writer.writerow(header)
        for r in rows:
            line = [
                r["full_name"],
            ]
            for a in assignments:
                line.append(scores.get(r["student_id"], {}).get(str(a.id), 0))
            line.extend([f"{r['final_pct']:.1f}", r["display_grade"]])
            writer.writerow(line)
        return Response(
            buf.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment; filename=gradebook_{course_id}.csv"},
        )
    else:
        # pdf branch
        # try to import WeasyPrint lazily so missing native deps don't crash app startup
        try:
            from weasyprint import HTML
            
            # enrich rows with per-assignment values for template
            for r in rows:
                for a in assignments:
                    r[str(a.id)] = scores.get(r["student_id"], {}).get(str(a.id), 0)
            html_string = render_template(
                "gradebook.html",
                course=course,
                term=term,
                assignments=assignments,
                rows=rows,
                generated_at=datetime.utcnow(),
            )
            pdf_bytes = HTML(string=html_string).write_pdf()
            return Response(
                pdf_bytes,
                mimetype="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=gradebook_{course_id}.pdf"},
            )
        except (ImportError, OSError) as e:
            # ImportError: WeasyPrint not installed
            # OSError: missing native GTK/Pango dependencies at runtime
            return (
                jsonify({"error": "PDF export unavailable — WeasyPrint not installed"}),
                503,
            )
