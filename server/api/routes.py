from flask import Blueprint, jsonify
import json

api_bp = Blueprint("api", __name__, url_prefix="/api")

def get3NearestCameras(latitude, longitude):
    with open('data.json', 'r') as f:
        data = json.load(f)

    for camera in data["cameras"]:

@api_bp.route("/api")
    # return ...

