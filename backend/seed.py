import os
from app import create_app, db, bcrypt
from app.models import User, UserRole


def run():
    app = create_app()
    with app.app_context():
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")
        
        if not admin_email or not admin_password:
            print("Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set.")
            return
        
        existing = User.query.filter_by(email=admin_email).first()
        if existing:
            print("Admin user already exists, skipping seed.")
            return

        password_hash = bcrypt.generate_password_hash(admin_password).decode("utf-8")
        admin = User(
            full_name="School Admin",
            email=admin_email,
            password_hash=password_hash,
            role=UserRole.admin,
            is_active=True,
        )
        db.session.add(admin)
        db.session.commit()
        print("Created admin user.")


if __name__ == "__main__":
    run()
