from flask import jsonify

from . import api_v1


@api_v1.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200
