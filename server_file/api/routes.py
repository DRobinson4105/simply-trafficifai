from flask import Blueprint, jsonify

api_bp = Blueprint("api", __name__, url_prefix="/api")


@api_bp.route("/test")
def test():
    return jsonify(message="Hello from API!")


# Add more API endpoints here, e.g.:
@api_bp.route("/foo")
def foo():
    return jsonify(foo="bar")
