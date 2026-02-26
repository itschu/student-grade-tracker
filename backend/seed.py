from app import create_app, db, bcrypt
from app.models import User, UserRole


def run():
    app = create_app()
    with app.app_context():
        existing = User.query.filter_by(email="admin@school.edu").first()
        if existing:
            print("Admin user already exists, skipping seed.")
            return

        password_hash = bcrypt.generate_password_hash("admin123").decode("utf-8")
        admin = User(
            full_name="School Admin",
            email="admin@school.edu",
            password_hash=password_hash,
            role=UserRole.admin,
            is_active=True,
        )
        db.session.add(admin)
        db.session.commit()
        print("Created admin user.")


if __name__ == "__main__":
    run()
