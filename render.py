import json
import os
import firebase_admin
from firebase_admin import credentials, firestore
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from moviepy.video.fx.all import crop

# 1. Firestore 초기화 (Process 3 준비)
def init_db():
    # 환경 변수에서 설정된 firebase_config를 사용한다고 가정합니다.
    # 실제 환경에서는 서비스 계정 키 파일(.json) 경로가 필요합니다.
    if not firebase_admin._apps:
        cred = credentials.Certificate("path/to/serviceAccountKey.json")
        firebase_admin.initialize_app(cred)
    return firestore.client()

def create_shorts_with_subtitles(input_video_path, analysis_json, app_id="default-app-id"):
    """
    1번 프로세스(자막)와 3번 프로세스(저장)가 통합된 메인 파이프라인
    """
    db = init_db()
    data = json.loads(analysis_json)
    video = VideoFileClip(input_video_path)
    width, height = video.size

    video_title = data.get("video_title", "Untitled Video")

    for clip_data in data['clips']:
        start = clip_data['start_timestamp']
        end = clip_data['end_timestamp']
        box = clip_data['active_speaker_box']

        # --- [1단계: 클리핑 및 크로핑] ---
        subclip = video.subclip(start, end)
        center_x = (box[1] + box[3]) / 2 / 1000 * width
        target_width = height * (9/16)
        x1 = max(0, center_x - target_width / 2)
        x2 = min(width, x1 + target_width)
        if x2 == width: x1 = x2 - target_width

        cropped_clip = crop(subclip, x1=x1, y1=0, x2=x2, y2=height)

        # --- [2단계: 자막 오버레이 (Process 1)] ---
        # 간단한 중앙 하단 자막 예시
        txt_clip = TextClip(
            clip_data['full_transcript'],
            fontsize=50,
            color='white',
            font='Arial-Bold',
            stroke_color='black',
            stroke_width=2,
            method='caption',
            size=(target_width*0.8, None)
        ).set_duration(cropped_clip.duration).set_position(('center', height * 0.8))

        final_video = CompositeVideoClip([cropped_clip, txt_clip])

        # --- [3단계: 파일 저장 및 메타데이터 전송 (Process 3)] ---
        output_filename = f"short_{clip_data['id']}.mp4"
        # final_video.write_videofile(output_filename, codec="libx264", audio_codec="aac")

        # Firestore에 데이터 저장 (Rule 1 준수)
        doc_ref = db.collection('artifacts', app_id, 'public', 'data', 'clips').document(f"clip_{clip_data['id']}")
        doc_ref.set({
            "title": video_title,
            "clip_id": clip_data['id'],
            "viral_score": clip_data['viral_score'],
            "hook": clip_data['hook_text'],
            "transcript": clip_data['full_transcript'],
            "status": "completed",
            "file_path": output_filename,
            "created_at": firestore.SERVER_TIMESTAMP
        })

        print(f"✅ 클립 {clip_data['id']} 처리 및 DB 동기화 완료")

# 실행 예시
# create_shorts_with_subtitles("video.mp4", analysis_json_string)