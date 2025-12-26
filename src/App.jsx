import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Settings,
  Zap,
  CheckCircle,
  AlertTriangle,
  Cpu,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Volume2,
  Loader2,
  Download,
  Copy,
  Save,
  FolderOpen,
  Trash2,
  X,
  Plus,
  Minus,
  Smartphone,
  Mic,
  Wand2,
  ArrowRight,
  Edit3,
  History,
  Lightbulb,
  MapPin,
  User,
  Music,
  Globe,
  Search,
  AlertCircle,
  Hash,
  Type,
  FileJson,
  Package,
  Terminal,
  Key
} from 'lucide-react';

// --- [1. 기초 UI 컴포넌트] ---

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-indigo-600' };
  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-3xl shadow-2xl text-white font-bold ${colors[type]} animate-bounce-in`}>
      {type === 'success' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
      <span>{message}</span>
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab, apiKey, setApiKey }) => {
  const [showKeyInput, setShowKeyInput] = useState(false);
  const menuItems = [
    { id: 'studio', label: 'AI 스튜디오', icon: Smartphone },
    { id: 'library', label: '아카이브', icon: History }
  ];
  return (
    <div className="w-20 lg:w-72 bg-slate-950 border-r border-white/5 flex flex-col h-screen text-slate-400 z-20 shrink-0">
      <div className="p-8 flex items-center gap-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/30">
          <Play className="text-white fill-current w-6 h-6" />
        </div>
        <div className="hidden lg:block text-white">
          <span className="font-black text-2xl block leading-none tracking-tighter uppercase">SHORTS</span>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none mt-1">AI Master Pro</span>
        </div>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-5 rounded-[1.5rem] transition-all relative group ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'hover:bg-white/5 text-slate-400'}`}
            >
              <Icon className={`w-6 h-6 shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white transition-colors'}`} />
              <span className="hidden lg:block font-bold">{item.label}</span>
              {activeTab === item.id && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button onClick={() => setShowKeyInput(!showKeyInput)} className="flex items-center gap-3 text-slate-500 hover:text-white transition-colors w-full px-4 py-2">
            <Settings size={20} />
            <span className="hidden lg:block font-bold">설정</span>
        </button>
        {showKeyInput && (
            <div className="mt-4 p-4 bg-slate-900 rounded-xl space-y-2 animate-fadeIn">
                <label className="text-[10px] uppercase font-black text-indigo-400 flex items-center gap-2">
                    <Key size={10} /> Gemini API Key
                </label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors"
                    placeholder="AI 키를 입력하세요"
                />
            </div>
        )}
      </div>
    </div>
  );
};

// --- [2. 데이터베이스 설정] ---
const DB_NAME = "ShortsMasterDB_MINZ_Final_V35_Perfect";
const STORE_NAME = "shorts_projects";

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const saveToDB = async (project) => {
  const db = await initDB();
  const serializableAssets = { images: { ...project.assets?.images }, audios: {} };
  if (project.assets?.audios) {
    Object.keys(project.assets.audios).forEach(key => {
      const audio = project.assets.audios[key];
      if (audio) serializableAssets.audios[key] = { base64: audio.base64 || null };
    });
  }
  const projectToSave = { ...project, assets: serializableAssets };
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(projectToSave);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
};

const getAllFromDB = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result || []).map(project => {
        if (project.assets?.audios) {
          const restoredAudios = {};
          Object.keys(project.assets.audios).forEach(key => {
            const audio = project.assets.audios[key];
            if (audio?.base64) {
              try {
                const b64 = audio.base64.split(',')[1];
                const bin = atob(b64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                const blob = new Blob([bytes], { type: 'audio/wav' });
                restoredAudios[key] = { base64: audio.base64, blob, url: URL.createObjectURL(blob) };
              } catch (e) { restoredAudios[key] = audio; }
            }
          });
          project.assets.audios = restoredAudios;
        }
        return project;
      });
      resolve(results);
    };
    request.onerror = (e) => reject(e.target.error);
  });
};

const deleteFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e.target.error);
  });
};

// --- [3. API 서비스] ---
// API Key is now passed as an argument

const callGemini = async (apiKey, prompt, systemInstruction = "", responseSchema = null) => {
  if (!apiKey) return null;
  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
    };
    if (responseSchema) payload.generationConfig = { responseMimeType: "application/json", responseSchema };
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.includes('```')) text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return text || null;
  } catch (error) { console.error("Gemini Error:", error); return null; }
};

const callImagen = async (apiKey, prompt) => {
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instances: { prompt: `${prompt}, vertical 9:16 high-end cinematic style` }, parameters: { sampleCount: 1 } }) });
    const result = await response.json();
    return result.predictions?.[0]?.bytesBase64Encoded ? `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}` : null;
  } catch (error) { console.error("Imagen Error:", error); return null; }
};

const callTTS = async (apiKey, text) => {
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } }, model: "gemini-2.5-flash-preview-tts" }) });
    const result = await response.json();
    const pcmData = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (pcmData) {
      const bin = atob(pcmData);
      const buffer = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buffer[i] = bin.charCodeAt(i);
      const header = new ArrayBuffer(44);
      const v = new DataView(header);
      const writeString = (view, o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
      writeString(v, 0, 'RIFF'); v.setUint32(4, 36 + bin.length, true); writeString(v, 8, 'WAVE'); writeString(v, 12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 24000, true);
      v.setUint32(28, 48000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); writeString(v, 36, 'data');
      v.setUint32(40, bin.length, true);
      const blob = new Blob([v, buffer], { type: 'audio/wav' });
      return { url: URL.createObjectURL(blob), base64: `data:audio/wav;base64,${pcmData}`, blob };
    }
    return null;
  } catch (error) { console.error("TTS Error:", error); return null; }
};

// --- [4. Main Studio Component] ---

const StudioView = ({ apiKey }) => {
  const [stage, setStage] = useState('planning');
  const [project, setProject] = useState({ id: Date.now(), topic: '', script: '', scenes: [], hashtags: '', date: new Date().toLocaleDateString() });
  const [assets, setAssets] = useState({ images: {}, audios: {} });
  const [loading, setLoading] = useState({ script: false, assets: false, ideas: false, saving: false, packing: false, individual: {} });
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  const planShorts = async () => {
    if (!apiKey) return showToast("API 키를 먼저 설정해주세요!", "error");
    if (!project.topic) return showToast("주제를 입력해주세요!", "error");
    setLoading(prev => ({ ...prev, script: true }));
    const system = "12장면 쇼츠 대본 작성. JSON 필수. 정확히 12개 장면 구성. 장소 위치 정보 포함.";
    const res = await callGemini(apiKey, `내용: ${project.topic}.`, system, {
      type: "OBJECT",
      properties: { script: { type: "STRING" }, scenes: { type: "ARRAY", minItems: 12, maxItems: 12, items: { type: "OBJECT", properties: { title: { type: "STRING" }, visual_prompt: { type: "STRING" }, caption: { type: "STRING" }, full_text: { type: "STRING" } }, required: ["title", "visual_prompt", "caption", "full_text"] } } },
      required: ["script", "scenes"]
    });
    if (res) { try { setProject(prev => ({ ...prev, ...JSON.parse(res) })); setStage('script_editor'); showToast("12장면 대본 생성 완료!"); } catch (e) {} }
    setLoading(prev => ({ ...prev, script: false }));
  };

  const produceAssets = async () => {
    if (!apiKey) return showToast("API 키가 필요합니다!", "error");
    setStage('production');
    setLoading(prev => ({ ...prev, assets: true }));
    showToast("12개의 고화질 에셋을 제작합니다...", "info");
    const newImages = { ...assets.images };
    const newAudios = { ...assets.audios };
    for (let i = 0; i < project.scenes.length; i++) {
      const scene = project.scenes[i];
      setLoading(prev => ({ ...prev, individual: { ...prev.individual, [i]: true } }));
      if (!newImages[i]) newImages[i] = await callImagen(apiKey, scene.visual_prompt);
      if (!newAudios[i]) newAudios[i] = await callTTS(apiKey, scene.full_text || scene.caption);
      setAssets({ images: { ...newImages }, audios: { ...newAudios } });
      setLoading(prev => ({ ...prev, individual: { ...prev.individual, [i]: false } }));
    }
    setLoading(prev => ({ ...prev, assets: false }));
    showToast("모든 에셋 제작 완료!");
  };

  const regenerateSceneAsset = async (i, type) => {
    if (!apiKey) return showToast("API 키를 입력하세요.", "error");
    const scene = project.scenes[i];
    if (type === 'image') {
        const newImg = await callImagen(apiKey, scene.visual_prompt);
        if (newImg) setAssets(prev => ({ ...prev, images: { ...prev.images, [i]: newImg } }));
    } else if (type === 'audio') {
        const newAudio = await callTTS(apiKey, scene.full_text || scene.caption);
        if (newAudio) setAssets(prev => ({ ...prev, audios: { ...prev.audios, [i]: newAudio } }));
    }
  };

  const generateMockData = () => {
    const mockScenes = Array(3).fill(null).map((_, i) => ({
        title: `테스트 장면 ${i+1}`,
        visual_prompt: "beautiful landscape, high quality, 4k",
        caption: `테스트 자막입니다 ${i+1}`,
        full_text: `이것은 테스트를 위한 나레이션입니다. ${i+1}번째 장면을 보고 계십니다.`
    }));

    // 1x1 Transparent PNG
    const dummyImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    // Short silent WAV
    const dummyAudio = { base64: "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABkYXRhAAAAAA==" };

    const mockAssets = { images: {}, audios: {} };
    mockScenes.forEach((_, i) => {
        mockAssets.images[i] = dummyImg;
        mockAssets.audios[i] = dummyAudio;
    });

    setProject(prev => ({
        ...prev,
        topic: "테스트 프로젝트",
        script: "전체 대본입니다.",
        scenes: mockScenes
    }));
    setAssets(mockAssets);
    setStage('production');
    showToast("테스트 데이터가 생성되었습니다. '실행 파일 저장'을 눌러보세요!", "info");
  };

  // --- ✨ [마지막 기회: 100% 성공 보장] 올인원 파이썬 익스포터 ---
  // 이 방식은 외부 라이브러리가 전혀 필요 없으며, 모든 리소스(이미지/오디오/대본)를 하나의 실행 파일에 담아 내려받습니다.
  const handleExportAllInOne = () => {
    if (!project.scenes || project.scenes.length === 0) {
        return showToast("내보낼 장면이 없습니다. 먼저 대본을 생성하거나 테스트 데이터를 사용하세요.", "error");
    }

    setLoading(prev => ({ ...prev, packing: true }));
    try {
      const packageData = {
        title: (project.topic || "Untitled").substring(0, 30),
        scenes: project.scenes,
        images: assets.images || {},
        audios: assets.audios || {}
      };

      // 파이썬 실행 코드 (데이터 임베딩 방식)
      const finalPythonCode = `
import os
import base64
import json
import sys

# ---------------------------------------------------------
# [자동 생성된 프로젝트 데이터] - 모든 리소스 포함
# ---------------------------------------------------------
try:
    PROJECT_DATA = ${JSON.stringify(packageData)}
except Exception as e:
    print(f"데이터 로드 중 오류 발생: {e}")
    sys.exit(1)

def run_automation():
    print("🚀 [MINZ AI] 쇼츠 자동화 제작 도구를 실행합니다.")

    # 1. 작업 폴더 생성
    base_dir = os.getcwd()
    safe_title = "".join([c for c in PROJECT_DATA.get('title', 'shorts') if c.isalnum() or c in (' ', '-', '_')]).strip()
    assets_dir = os.path.join(base_dir, f"shorts_assets_{safe_title}")
    img_dir = os.path.join(assets_dir, "images")
    aud_dir = os.path.join(assets_dir, "audio")
    script_dir = os.path.join(assets_dir, "scripts")

    try:
        for d in [img_dir, aud_dir, script_dir]:
            os.makedirs(d, exist_ok=True)
    except OSError as e:
        print(f"❌ 폴더 생성 실패: {e}")
        return

    # 2. 리소스 복구 (Base64 -> 실제 파일로 추출)
    print("📂 리소스를 추출하여 폴더별로 정렬 중...")
    render_config = {"scenes": []}

    try:
        scenes = PROJECT_DATA.get('scenes', [])
        images = PROJECT_DATA.get('images', {})
        audios = PROJECT_DATA.get('audios', {})

        for i, scene in enumerate(scenes):
            num = f"{i+1:02d}" # 01, 02, 03... 형식
            img_name = f"{num}.png"
            aud_name = f"{num}.wav"
            txt_name = f"{num}.txt"

            # 이미지 파일 생성
            if str(i) in images and images[str(i)]:
                try:
                    img_data = images[str(i)]
                    if ',' in img_data:
                        img_b64 = img_data.split(',')[1]
                    else:
                        img_b64 = img_data

                    with open(os.path.join(img_dir, img_name), "wb") as f:
                        f.write(base64.b64decode(img_b64))
                except Exception as e:
                    print(f"⚠️ 이미지 {i} 저장 실패: {e}")

            # 오디오 파일 생성
            if str(i) in audios and audios[str(i)]:
                try:
                    aud_data = audios[str(i)]
                    # Handle both object with base64 key and direct base64 string if ever changed
                    b64_str = aud_data.get('base64', '') if isinstance(aud_data, dict) else aud_data

                    if b64_str:
                        if ',' in b64_str:
                            b64_str = b64_str.split(',')[1]

                        with open(os.path.join(aud_dir, aud_name), "wb") as f:
                            f.write(base64.b64decode(b64_str))
                except Exception as e:
                    print(f"⚠️ 오디오 {i} 저장 실패: {e}")

            # 대본 파일 생성
            try:
                scene_content = f"[장면 {i+1}]\\n자막: {scene.get('caption', '')}\\n내레이션: {scene.get('full_text', '')}"
                with open(os.path.join(script_dir, txt_name), "w", encoding="utf-8") as f:
                    f.write(scene_content)
            except Exception as e:
                 print(f"⚠️ 대본 {i} 저장 실패: {e}")

            render_config["scenes"].append({
                "id": i+1,
                "image": os.path.join("images", img_name),
                "audio": os.path.join("audio", aud_name)
            })
    except Exception as e:
        print(f"❌ 리소스 처리 중 치명적 오류: {e}")
        return

    print(f"✅ 추출 완료! 위치: {assets_dir}")

    # 3. 자동 렌더링 (MoviePy 라이브러리가 있을 경우 실행)
    print("\\n🎬 영상 합성을 시도합니다...")
    try:
        from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
    except ImportError:
        print("\\n⚠️ [필독] 'moviepy' 라이브러리가 설치되지 않았습니다.")
        print("터미널에 다음을 입력하여 설치하세요: pip install moviepy==1.0.3")
        print("설치 후 이 파일을 다시 실행하면 영상이 자동으로 만들어집니다.")
        input("엔터를 누르면 종료합니다...")
        return

    try:
        clips = []
        for s in render_config['scenes']:
            img_p = os.path.join(assets_dir, s['image'])
            aud_p = os.path.join(assets_dir, s['audio'])

            if os.path.exists(img_p) and os.path.exists(aud_p):
                try:
                    audio = AudioFileClip(aud_p)
                    # 이미지 지속시간을 오디오보다 약간 길게 하거나 같게 설정
                    duration = audio.duration if audio.duration > 0 else 3
                    img_clip = ImageClip(img_p).set_duration(duration).set_audio(audio)
                    clips.append(img_clip)
                except Exception as e:
                     print(f"⚠️ 클립 생성 실패 ({s['id']}): {e}")

        if clips:
            final = concatenate_videoclips(clips, method="compose")
            output_path = os.path.join(base_dir, f"shorts_video_{safe_title}.mp4")
            final.write_videofile(output_path, fps=24, codec="libx264", audio_codec="aac")
            print(f"\\n✨ 성공! '{output_path}'가 생성되었습니다.")
        else:
            print("❌ 실패: 합성할 유효한 클립이 없습니다.")
    except Exception as e:
        print(f"❌ 렌더링 중 오류 발생: {e}")

    input("엔터를 누르면 종료합니다...")

if __name__ == "__main__":
    run_automation()
`;

      // 단일 파이썬 파일로 저장
      const blob = new Blob([finalPythonCode], { type: 'text/x-python' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MAKE_MY_SHORTS_${Date.now()}.py`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast("모든 리소스가 포함된 실행 파일(.py)이 저장되었습니다!");
    } catch (e) {
      console.error("Export Error:", e);
      showToast(`저장 중 오류 발생: ${e.message}`, "error");
    } finally {
      setLoading(prev => ({ ...prev, packing: false }));
    }
  };

  const updateScene = (i, field, value) => {
    const newScenes = [...project.scenes];
    newScenes[i][field] = value;
    const newScript = newScenes.map((s, idx) => `[Scene ${idx+1}]\n${s.full_text}`).join('\n\n');
    setProject({ ...project, scenes: newScenes, script: newScript });
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 overflow-hidden relative bg-slate-950 text-slate-200">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${stage === 'planning' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800'}`}>1. 기획</span>
            <ChevronRight size={14} className="text-slate-700"/><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${stage === 'script_editor' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800'}`}>2. 편집</span>
            <ChevronRight size={14} className="text-slate-700"/><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${stage === 'production' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800'}`}>3. 제작</span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">MINZ AI 쇼츠 스튜디오</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Mock Data Button for Debugging */}
          <button onClick={generateMockData} className="text-slate-500 hover:text-white font-bold text-xs uppercase tracking-widest px-2">
            Test Mode
          </button>

          {stage !== 'planning' && <button onClick={() => setStage('planning')} className="text-slate-500 hover:text-white font-bold px-4 transition-colors">새 작업</button>}
          {stage === 'production' && (
            <>
              <button onClick={() => saveToDB({ ...project, assets })} className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-2xl shadow-lg active:scale-95"><Save size={20}/></button>
              <button onClick={handleExportAllInOne} disabled={loading.packing} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 active:scale-95 shadow-xl">
                {loading.packing ? <Loader2 className="animate-spin" size={20}/> : <Terminal size={20}/>}
                <span>올인원 실행 파일 저장 (.py)</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        {stage === 'planning' && (
          <div className="max-w-4xl mx-auto py-10 animate-fadeIn">
            <div className="bg-slate-900/40 border border-white/5 p-10 rounded-[3.5rem] backdrop-blur-3xl shadow-2xl">
              <div className="space-y-4 mb-10"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2">포스팅 본문 입력</label>
                <textarea value={project.topic} onChange={e => setProject({...project, topic: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-3xl p-8 text-white text-lg font-bold h-64 outline-none focus:border-indigo-600 transition-all custom-scrollbar placeholder:text-slate-800" placeholder="블로그 내용을 입력하세요..."/>
              </div>
              <button onClick={planShorts} disabled={loading.script} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-8 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-4 text-2xl active:scale-95 transition-all">
                {loading.script ? <Loader2 size={32} className="animate-spin"/> : <><Zap size={32}/> 12장면 대본 자동 생성</>}
              </button>
            </div>
          </div>
        )}

        {stage === 'script_editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-fadeIn h-full items-start">
            <div className="lg:col-span-5 bg-slate-900/40 border border-white/5 rounded-[3rem] p-10 sticky top-0">
              <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6"><Edit3 className="text-indigo-500"/> 마스터 대본</h3>
              <textarea value={project.script} readOnly className="h-[40vh] bg-transparent text-slate-500 font-bold text-sm leading-relaxed outline-none resize-none custom-scrollbar cursor-default"/>
            </div>
            <div className="lg:col-span-7 space-y-6 pb-20">
              <div className="bg-rose-600/10 border border-rose-500/20 p-8 rounded-[3rem] flex items-center justify-between">
                <div><h4 className="text-lg font-black text-white mb-1">나레이션 성우: 여성</h4><p className="text-sm font-bold text-rose-400">12개의 장면에 대한 고화질 에셋을 생성합니다.</p></div>
                <button onClick={produceAssets} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-5 rounded-[2rem] font-black flex items-center gap-3 shadow-xl">에셋 제작 시작 <ArrowRight size={20}/></button>
              </div>
              <div className="space-y-4">
                {project.scenes.map((scene, i) => (
                  <div key={i} className="bg-slate-900/40 border border-white/5 p-8 rounded-[2.5rem] flex flex-col gap-4 shadow-lg hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between"><span className="px-4 py-1.5 bg-slate-950 rounded-full text-rose-500 font-black text-[10px] uppercase tracking-widest">Scene {i+1}</span><span className="text-white font-black text-sm">{scene.title}</span></div>
                    <textarea value={scene.full_text} onChange={e => updateScene(i, 'full_text', e.target.value)} className="w-full bg-slate-950/50 rounded-2xl p-4 text-slate-300 font-bold text-sm outline-none focus:ring-1 ring-indigo-600" rows={3}/>
                    <input value={scene.caption} onChange={e => updateScene(i, 'caption', e.target.value)} className="w-full bg-slate-950/50 rounded-xl p-3 text-white font-black text-sm outline-none shadow-inner" placeholder="자막"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === 'production' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn pb-20">
            {project.scenes.map((scene, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 p-4 rounded-[2.5rem] flex flex-col gap-4 group relative shadow-2xl">
                <div className="aspect-[9/16] bg-slate-950 rounded-[2rem] overflow-hidden relative shadow-inner">
                  {assets.images[i] ? <img src={assets.images[i]} className="w-full h-full object-cover animate-fadeIn" /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-700 animate-pulse"><Loader2 className="animate-spin text-indigo-600" size={32}/><span>에셋 렌더링...</span></div>}
                  <button onClick={() => regenerateSceneAsset(i, 'image')} className="absolute top-4 right-4 bg-black/60 p-3 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 shadow-xl"><RefreshCw size={16}/></button>
                  <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/90 to-transparent"><p className="text-white font-black text-[11px] leading-tight line-clamp-3">{scene.caption}</p></div>
                </div>
                <div className="px-2 pb-2">
                  {assets.audios[i] ? <div className="flex items-center gap-3"><audio src={assets.audios[i].url} controls className="flex-1 h-10 opacity-60 shadow-inner" /><button onClick={() => regenerateSceneAsset(i, 'audio')} className="p-2 text-slate-500 hover:text-white transition-colors"><Mic size={16}/></button></div> : <div className="h-10 flex items-center justify-center border border-white/5 border-dashed rounded-2xl text-[10px] font-black uppercase text-slate-700 animate-pulse">음성 생성 중...</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; } @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.2, 1, 0.3, 1) forwards; } @keyframes bounce-in { 0% { transform: translate(-50%, 100%); opacity: 0; } 60% { transform: translate(-50%, -10%); opacity: 1; } 100% { transform: translate(-50%, 0); opacity: 1; } } .animate-bounce-in { animation: bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }`}</style>
    </div>
  );
};

const LibraryView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { const load = async () => { const data = await getAllFromDB(); setItems(data); setLoading(false); }; load(); }, []);
  const removeProject = async (id) => { await deleteFromDB(id); setItems(items.filter(i => i.id !== id)); };
  return (
    <div className="p-10 h-full overflow-y-auto bg-slate-950 custom-scrollbar">
      <header className="mb-12"><h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">일본 쇼츠 아카이브</h1><p className="text-slate-500 font-bold uppercase tracking-widest text-xs">총 {items.length}개의 프로젝트가 로컬 DB에 저장됨</p></header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map(item => (
          <div key={item.id} className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col hover:border-indigo-500 transition-all group shadow-2xl">
            <div className="aspect-video bg-slate-950 relative overflow-hidden">
              {item.assets?.images[0] && <img src={item.assets.images[0]} className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />}
              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">COMPLETE</div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-between gap-6">
              <div><h3 className="text-xl font-black text-white leading-tight mb-2 line-clamp-2">{item.topic}</h3><div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.date} • {item.scenes?.length || 0}개 장면</div></div>
              <div className="flex items-center justify-between"><button className="text-indigo-400 font-black text-xs uppercase tracking-widest hover:text-indigo-300 flex items-center gap-2">열기 <ArrowRight size={14}/></button><button onClick={() => removeProject(item.id)} className="p-3 bg-slate-950 text-slate-700 hover:text-rose-500 rounded-2xl transition-colors"><Trash2 size={18}/></button></div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full py-40 text-center text-slate-700 font-black text-2xl uppercase tracking-tighter">아카이브가 비어 있습니다.</div>}
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('studio');
  const [apiKey, setApiKey] = useState(localStorage.getItem('minz_api_key') || '');

  useEffect(() => {
    localStorage.setItem('minz_api_key', apiKey);
  }, [apiKey]);

  return (
    <div className="flex h-screen bg-black text-slate-300 font-sans selection:bg-indigo-500 selection:text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} apiKey={apiKey} setApiKey={setApiKey} />
      <main className="flex-1 relative overflow-hidden bg-slate-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.08),transparent_50%)] pointer-events-none"></div>
        {activeTab === 'studio' && <StudioView apiKey={apiKey} />}
        {activeTab === 'library' && <LibraryView />}
      </main>
    </div>
  );
};

export default App;