import json
import random
from datetime import datetime
from pathlib import Path

from flask import Flask, render_template, request, jsonify

from models import init_db, save_session, release_butterfly, get_butterfly_count, get_stats
from ai_client import analyze_conversation, personalize_story, deep_talk, deep_reply, get_symptom_advice
from stories import STORIES

BASE_DIR = Path(__file__).resolve().parent
app = Flask(
    __name__,
    template_folder=str(BASE_DIR / "templates"),
    static_folder=str(BASE_DIR / "static"),
)


@app.after_request
def add_cors_headers(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/conversation", methods=["POST"])
def api_conversation():
    data = request.get_json(silent=True)
    if not data or not data.get("message"):
        return jsonify({"error": "请告诉我发生了什么"}), 400

    user_message = data["message"].strip()
    result = analyze_conversation(user_message)

    session_id = save_session(
        user_message=user_message,
        ai_response=result.get("response", ""),
        root_cause=result.get("root_cause", ""),
        literature_ref="",
        emotion=result.get("emotion", ""),
        scene=data.get("scene", ""),
        symptom="",
    )

    return jsonify({
        "session_id": session_id,
        "response": result.get("response", ""),
        "root_cause": result.get("root_cause", ""),
        "emotion": result.get("emotion", ""),
    })


@app.route("/api/symptom", methods=["POST"])
def api_symptom():
    data = request.get_json(silent=True)
    if not data or not data.get("symptom"):
        return jsonify({"error": "请选择症状"}), 400

    symptom = data["symptom"]
    advice = get_symptom_advice(symptom)
    if not advice:
        return jsonify({"error": "未知症状类型"}), 400

    return jsonify({
        "symptom": symptom,
        "message": advice["message"],
        "options": advice.get("options") or advice.get("desserts") or advice.get("soundscapes") or [],
        "type": advice["type"],
    })


@app.route("/api/deep-talk", methods=["POST"])
def api_deep_talk():
    """Generate a deep, warm response and a thoughtful question."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "请提供数据"}), 400

    user_concern = data.get("concern", "")
    symptom = data.get("symptom", "")
    result = deep_talk(user_concern, symptom)

    return jsonify({
        "response": result.get("response", ""),
        "question": result.get("question", ""),
        "emotion": result.get("emotion", ""),
    })


@app.route("/api/deep-reply", methods=["POST"])
def api_deep_reply():
    """Respond warmly to the user's answer to a deep question."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "请提供数据"}), 400

    user_concern = data.get("concern", "")
    question = data.get("question", "")
    answer = data.get("answer", "")
    result = deep_reply(user_concern, question, answer)

    return jsonify({
        "response": result.get("response", ""),
    })


@app.route("/api/story", methods=["POST"])
def api_story():
    data = request.get_json(silent=True)
    user_concern = data.get("concern", "") if data else ""

    story = random.choice(STORIES)
    personalized = personalize_story(story["story"], user_concern)

    return jsonify({
        "title": story["title"],
        "story": story["story"],
        "preamble": personalized.get("preamble", ""),
        "afterword": personalized.get("afterword", ""),
    })


@app.route("/api/release", methods=["POST"])
def api_release():
    data = request.get_json(silent=True)
    session_id = data.get("session_id") if data else None
    butterfly_id = release_butterfly(session_id)
    total = get_butterfly_count()
    return jsonify({
        "butterfly_id": butterfly_id,
        "total_butterflies": total,
    })


@app.route("/api/butterflies", methods=["GET"])
def api_butterflies():
    count = get_butterfly_count()
    stats = get_stats()
    return jsonify({
        "total_butterflies": count,
        "total_sessions": stats["total_sessions"],
    })


@app.route("/api/stats", methods=["GET"])
def api_stats():
    s = get_stats()
    return jsonify(s)


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e.description) if e.description else "请求有误"}), 400


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "牙牙打了个盹，请稍后再试"}), 500


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5001, threaded=True)
