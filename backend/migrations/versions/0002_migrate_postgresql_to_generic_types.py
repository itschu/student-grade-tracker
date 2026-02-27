"""migrate postgresql uuid and enum to generic string types

Revision ID: 0002_migrate_pg_generic
Revises: 0001_initial_schema
Create Date: 2026-02-26 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0002_migrate_pg_generic'
down_revision = '0001_initial_schema'
branch_labels = None
depends_on = None


def upgrade():
    # SQLite can't alter column types in place; the initial schema already
    # uses TEXT for the UUID/ENUM columns when running locally.  Rather than
    # attempting unsupported ALTER statements we'll just skip the whole
    # migration on sqlite.
    bind = op.get_bind()
    if bind.dialect.name == 'sqlite':
        # no-op for sqlite, tables already use generic text types
        return

    # Convert all UUID columns to VARCHAR(36) using USING cast for PostgreSQL
    # SQLite will ignore the USING clause since it doesn't have native UUID type
    
    # user table
    op.alter_column(
        'user',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    # user.role ENUM to VARCHAR(50)
    op.alter_column(
        'user',
        'role',
        type_=sa.String(50),
        postgresql_using='role::text',
        nullable=False,
    )
    
    # term table
    op.alter_column(
        'term',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    # course table
    op.alter_column(
        'course',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    op.alter_column(
        'course',
        'term_id',
        type_=sa.String(36),
        postgresql_using='term_id::text',
        nullable=False,
    )
    
    op.alter_column(
        'course',
        'teacher_id',
        type_=sa.String(36),
        postgresql_using='teacher_id::text',
        nullable=False,
    )
    
    # enrollment table
    op.alter_column(
        'enrollment',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    op.alter_column(
        'enrollment',
        'course_id',
        type_=sa.String(36),
        postgresql_using='course_id::text',
        nullable=False,
    )
    
    op.alter_column(
        'enrollment',
        'student_id',
        type_=sa.String(36),
        postgresql_using='student_id::text',
        nullable=False,
    )
    
    # assignment table
    op.alter_column(
        'assignment',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    op.alter_column(
        'assignment',
        'course_id',
        type_=sa.String(36),
        postgresql_using='course_id::text',
        nullable=False,
    )
    
    # assignment.type ENUM to VARCHAR(50)
    op.alter_column(
        'assignment',
        'type',
        type_=sa.String(50),
        postgresql_using='type::text',
        nullable=False,
    )
    
    # grade table
    op.alter_column(
        'grade',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    op.alter_column(
        'grade',
        'assignment_id',
        type_=sa.String(36),
        postgresql_using='assignment_id::text',
        nullable=False,
    )
    
    op.alter_column(
        'grade',
        'student_id',
        type_=sa.String(36),
        postgresql_using='student_id::text',
        nullable=False,
    )
    
    # grading_config table
    op.alter_column(
        'grading_config',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    # grading_config.display_mode ENUM to VARCHAR(50)
    op.alter_column(
        'grading_config',
        'display_mode',
        type_=sa.String(50),
        postgresql_using='display_mode::text',
        nullable=False,
    )
    
    op.alter_column(
        'grading_config',
        'effective_from_term_id',
        type_=sa.String(36),
        postgresql_using='effective_from_term_id::text',
        nullable=False,
    )
    
    # grade_boundary table
    op.alter_column(
        'grade_boundary',
        'id',
        type_=sa.String(36),
        postgresql_using='id::text',
        nullable=False,
    )
    
    op.alter_column(
        'grade_boundary',
        'grading_config_id',
        type_=sa.String(36),
        postgresql_using='grading_config_id::text',
        nullable=False,
    )
    
    # Drop orphaned ENUM types (PostgreSQL only)
    # Using raw SQL to drop types conditionally on PostgreSQL
    op.execute(
        "DO $$ BEGIN "
        "  BEGIN DROP TYPE userrole; EXCEPTION WHEN undefined_object THEN END; "
        "  BEGIN DROP TYPE assignmenttype; EXCEPTION WHEN undefined_object THEN END; "
        "  BEGIN DROP TYPE displaymode; EXCEPTION WHEN undefined_object THEN END; "
        "END $$;"
    )


def downgrade():
    # Downgrade is not straightforward since we can't recreate ENUM types from VARCHAR
    # For now, we'll just revert the column types to their previous types
    # This would require the original ENUM types to exist, which they won't after upgrade
    # In practice, users should not downgrade this migration
    
    # ENUM types need to be recreated first before this downgrade can work
    # For safety, we'll leave this as a no-op
    pass
