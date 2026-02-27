from functools import wraps
from flask import g, abort
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

from app import db
from app.models import User, Course, Enrollment


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # validate token
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user = User.query.get(identity)
        if user is None or not user.is_active:
            abort(401)
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if user is None:
                abort(401)
            if user.role not in roles:
                abort(403)
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def assert_teacher_owns_course(teacher_id, course_id):
    course = Course.query.get(course_id)
    if course is None or str(course.teacher_id) != str(teacher_id):
        abort(403)


def assert_student_enrolled(student_id, course_id):
    enrollment = Enrollment.query.filter_by(course_id=course_id, student_id=student_id).first()
    if enrollment is None:
        abort(403)
