import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles, Zap, Flame, MessageSquare, ThumbsUp, ThumbsDown,
  Bookmark, Share2, Search, Bell, Menu, LayoutDashboard,
  Database, Activity, TrendingUp, AlertCircle, RefreshCcw,
  Eye, ChevronRight, X, Loader2, Info, Terminal, BarChart3,
  Globe, Share, Wand2, PieChart, Lock, Key
} from 'lucide-react';
import {
  Chart as ChartJS,
  registerables
} from 'chart.js';
import { Bar, Line, Pie, Radar } from 'react-chartjs-2';

// Register all Chart.js components globally to fix scale registration errors
ChartJS.register(...registerables);

// --- Gemini API Configuration ---
const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";

const callGemini = async (prompt, systemInstruction = "") => {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    throw new Error("API Key가 설정되지 않았습니다.");
  }

  const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    ...(systemInstruction && { systemInstruction: { parts: [{ text: systemInstruction }] } })
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, details: ${errText}`);
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return typeof text === 'string' ? text : "결과를 가져오지 못했습니다.";
    } catch (error) {
      if (i === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

// --- Mock Data ---
const INITIAL_ARTICLES = [
  {
    id: 'art-1',
    category: "기술",
    title: "정부, 'AI 반도체 융합 패권' 선언... 10조 규모 펀드 조성",
    content: "정부가 인공지능과 반도체 산업의 글로벌 경쟁력을 확보하기 위해 대규모 투자를 단행합니다. 이번 투자는 차세대 반도체 공정과 AI 인프라 확충에 집중될 예정입니다.",
    source: "국가경제신문",
    time: "15분 전",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    tags: ["반도체", "정부투자", "AI 패권"],
    hotScore: 92,
    sentiment: "긍정적"
  },
  {
    id: 'art-2',
    category: "경제",
    title: "서울 아파트값 다시 '고공행진'... 전세난에 매수세 확산",
    content: "서울 주요 지역의 아파트 매매가가 3주 연속 상승세를 기록하며 불안한 조짐을 보이고 있습니다. 전세 물량 부족이 매매 수요를 자극하고 있다는 분석입니다.",
    source: "부동산라이브",
    time: "1시간 전",
    image: "https://images.unsplash.com/photo-1541888941255-20219669651c?w=800&q=80",
    tags: ["부동산", "서울아파트", "전세난"],
    hotScore: 88,
    sentiment: "경고"
  },
  {
    id: 'art-3',
    category: "사회",
    title: "주 4일제 전격 도입 실험... 기업들 '생산성 vs 인건비' 격론",
    content: "최근 일부 대기업과 스타트업을 중심으로 주 4일 근무제 도입이 확산되고 있습니다. 노동계는 환영하지만 경영계는 인건비 부담과 경쟁력 약화를 우려합니다.",
    source: "이슈투데이",
    time: "2시간 전",
    image: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80",
    tags: ["주4일제", "노사갈등", "기업트렌드"],
    hotScore: 95,
    sentiment: "논쟁적"
  }
];

const LOG_MESSAGES = [
  "Fetching RSS Feed from NewsAPI...",
  "Extraction successful. 42 new articles found.",
  "Pushing raw JSON to AWS S3 Data Lake...",
  "Spark Job #942 started: NLP Processing & Normalization",
  "KoBERT Embedding generated for article #8291",
  "Vector similarity search matching 423 user profiles",
  "Elasticsearch index synchronized. Latency: 42ms",
  "AI Analysis: High viral potential detected on 'Semiconductor' topic"
];

// --- Sub-Components ---

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{String(title)}</p>
      <h4 className="text-2xl font-black mt-1 text-gray-900">{String(value)}</h4>
      <p className={`text-xs mt-1 font-bold ${String(change).startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
        {String(change)} <span className="text-gray-400 font-normal ml-1">vs 전일</span>
      </p>
    </div>
    <div className={`p-3 rounded-xl transition-transform group-hover:scale-110 ${color}`}>
      {Icon && <Icon size={24} className="text-white" />}
    </div>
  </div>
);

// --- API Key Modal Component ---
const ApiKeyModal = ({ isOpen, onClose, onSave }) => {
  const [key, setKey] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-[2rem] shadow-2xl border border-slate-100 animate-in">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <Key size={32} />
          </div>
          <h3 className="text-xl font-black text-slate-900">API Key 설정</h3>
          <p className="text-sm text-slate-500 mt-2">Gemini API를 사용하기 위해 키를 입력해주세요.<br/>키는 브라우저에만 저장됩니다.</p>
        </div>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Google Gemini API Key 입력"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
        />
        <div className="flex gap-3">
            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black hover:bg-slate-200 transition-colors"
                >
                    취소
                </button>
            )}
            <button
            onClick={() => {
                if(key.trim()) onSave(key);
            }}
            disabled={!key.trim()}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
            저장하기
            </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [articles, setArticles] = useState(INITIAL_ARTICLES);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [toast, setToast] = useState(null);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // API Key State
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  // Auto-log simulation for Pipeline tab
  useEffect(() => {
    if (activeTab === 'pipeline') {
      const interval = setInterval(() => {
        const randomMsg = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
        setLogs(prev => [...prev, String(randomMsg)].slice(-10));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const showToast = (msg) => {
    setToast(String(msg));
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveKey = (key) => {
      localStorage.setItem('gemini_api_key', key);
      setApiKey(key);
      setIsKeyModalOpen(false);
      showToast("API Key가 저장되었습니다.");
  };

  // --- AI Operations ---
  const checkApiKey = () => {
      if (!apiKey) {
          setIsKeyModalOpen(true);
          return false;
      }
      return true;
  };

  const handleToneTransform = async (article, tone) => {
    if (!checkApiKey()) return;

    setIsAnalysing(true);
    setAiResponse(null);
    try {
      const prompt = `다음 기사를 '${tone}' 톤으로 재작성해줘. 핵심 정보는 유지하되 분위기를 바꿔줘.
      제목: ${article.title}
      본문: ${article.content}`;
      const res = await callGemini(prompt, "뉴스 편집자로서 톤을 변경해줘.");
      setAiResponse({ type: 'tone', content: String(res), label: tone });
    } catch (e) {
      console.error(e);
      showToast(e.message || "AI 호출 실패");
      if (String(e.message).includes("API Key")) {
          setIsKeyModalOpen(true);
      }
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleGeneratePoll = async (article) => {
    if (!checkApiKey()) return;

    setIsAnalysing(true);
    setAiResponse(null);
    try {
      const prompt = `이 기사의 주제로 도발적인 찬반 투표 질문과 선택지 2개를 만들어줘.
      기사: ${article.title}`;
      const res = await callGemini(prompt, "토론 중재자로서 투표를 생성해줘.");
      setAiResponse({ type: 'poll', content: String(res) });
    } catch (e) {
      console.error(e);
      showToast(e.message || "투표 생성 실패");
      if (String(e.message).includes("API Key")) {
          setIsKeyModalOpen(true);
      }
    } finally {
      setIsAnalysing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
        {/* --- Sidebar --- */}
        <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
          <div className="p-8 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-500/20">N</div>
            <span className="text-xl font-black tracking-tighter italic">NEWSFLOW AI</span>
          </div>

          <nav className="flex-grow px-4 space-y-1.5 py-4">
            <button onClick={() => setActiveTab('feed')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'feed' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <LayoutDashboard size={20} /> <span className="font-bold text-sm">뉴스 피드</span>
            </button>
            <button onClick={() => setActiveTab('ai-lab')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'ai-lab' ? 'bg-rose-600 text-white shadow-xl shadow-rose-500/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Wand2 size={20} /> <span className="font-bold text-sm">AI 실험실</span>
            </button>
            <button onClick={() => setActiveTab('pipeline')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'pipeline' ? 'bg-amber-600 text-white shadow-xl shadow-amber-500/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <Terminal size={20} /> <span className="font-bold text-sm">라이브 파이프라인</span>
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all ${activeTab === 'analytics' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'}`}>
              <BarChart3 size={20} /> <span className="font-bold text-sm">분석 매트릭스</span>
            </button>
          </nav>

          <div className="p-6 border-t border-slate-800 bg-slate-900/50">
            {/* API Key Status / Setting */}
            <button
                onClick={() => setIsKeyModalOpen(true)}
                className="w-full mb-4 bg-slate-800/80 p-3 rounded-2xl flex items-center gap-3 border border-slate-700 hover:bg-slate-800 transition-colors"
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${apiKey ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                    <Key size={14} />
                </div>
                <div className="text-left overflow-hidden">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">API ACCESS</p>
                    <p className={`text-xs font-black truncate ${apiKey ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {apiKey ? 'CONNECTED' : 'MISSING KEY'}
                    </p>
                </div>
            </button>

            <div className="bg-slate-800/80 p-4 rounded-2xl flex items-center gap-3 border border-slate-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black">AI</div>
              </div>
              <div>
                <p className="text-xs font-black">SYSTEM ADMIN</p>
                <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-bold uppercase"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Online</div>
              </div>
            </div>
          </div>
        </aside>

        {/* --- Main Content --- */}
        <main className="flex-grow overflow-y-auto p-4 md:p-10 no-scrollbar relative">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe size={16} className="text-indigo-500" />
                <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">AI Curation Engine V2.5</span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase">
                {activeTab === 'feed' && "실시간 지능형 피드"}
                {activeTab === 'ai-lab' && "AI 톤 트랜스포머"}
                {activeTab === 'pipeline' && "데이터 가속화 엔진"}
                {activeTab === 'analytics' && "인게이지먼트 분석"}
              </h2>
            </div>
            <div className="flex gap-3">
              <button className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all"><RefreshCcw size={20}/></button>
              <button className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 flex items-center gap-2">
                <TrendingUp size={18} /> 실시간 업데이트
              </button>
            </div>
          </div>

          {/* --- Views --- */}
          {activeTab === 'feed' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in">
              <div className="lg:col-span-2 space-y-8">
                {articles.map(article => (
                  <div key={article.id} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-2/5 h-56 md:h-auto overflow-hidden">
                        <img src={article.image} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      </div>
                      <div className="p-8 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">{article.category}</span>
                            <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg">
                              <Flame size={14} className="text-rose-500" fill="currentColor" />
                              <span className="text-[10px] font-black text-rose-500 uppercase">V-Score: {article.hotScore}</span>
                            </div>
                          </div>
                          <h3 className="text-xl font-black leading-tight mb-3 group-hover:text-indigo-600 transition-colors cursor-pointer">{article.title}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-6">{article.content}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">{article.source.charAt(0)}</div>
                            <div>
                              <span className="text-xs font-black text-slate-700 block">{article.source}</span>
                              <span className="text-xs text-slate-400">{article.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button className="p-2.5 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600"><Share2 size={16} /></button>
                            <button
                              onClick={() => {setSelectedArticle(article); setActiveTab('ai-lab');}}
                              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2"
                            >
                              <Wand2 size={14} /> AI 에디트
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                  <h4 className="font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Zap size={20} className="text-amber-500" /> 급상승 트렌드
                  </h4>
                  <div className="space-y-5">
                    {["반도체 패권", "주 4일 실험", "서울 부동산", "생성형 AI"].map((topic, i) => (
                      <div key={i} className="flex items-center justify-between group cursor-pointer">
                        <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{topic}</span>
                        <span className="text-xs font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">+{Math.floor(Math.random() * 500)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-lab' && (
            <div className="max-w-5xl mx-auto space-y-10 animate-in">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Wand2 size={24} className="text-indigo-500" /> 기사 선택 및 분석
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {articles.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedArticle(a)}
                      className={`p-6 rounded-[1.5rem] text-left transition-all border-2 ${selectedArticle?.id === a.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}
                    >
                      <h4 className="text-sm font-black leading-tight line-clamp-2">{a.title}</h4>
                    </button>
                  ))}
                </div>
              </div>

              {selectedArticle && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                    <h4 className="font-black text-slate-900 mb-8 italic">Tone Transformer</h4>
                    <div className="grid grid-cols-3 gap-2 mb-6">
                      {['자극적 클릭베이트', 'MZ 버전', '전문가 톤'].map(tone => (
                        <button
                          key={tone}
                          onClick={() => handleToneTransform(selectedArticle, tone)}
                          disabled={isAnalysing}
                          className="py-2.5 bg-slate-50 text-[10px] font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50"
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                    <div className="flex-grow bg-slate-50 rounded-[1.5rem] p-8 border-2 border-dashed border-slate-200 min-h-[200px] flex items-center justify-center">
                      {isAnalysing ? (
                        <Loader2 className="animate-spin text-indigo-600" size={32} />
                      ) : aiResponse?.type === 'tone' ? (
                        <p className="text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">{String(aiResponse.content)}</p>
                      ) : (
                        <p className="text-xs text-slate-400 font-bold uppercase">톤을 선택하여 분석을 시작하세요</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                      <h4 className="font-black text-slate-900 italic">AI Poll Generator</h4>
                      <button onClick={() => handleGeneratePoll(selectedArticle)} disabled={isAnalysing} className="bg-rose-100 text-rose-700 px-4 py-2 rounded-xl text-xs font-black">투표 생성</button>
                    </div>
                    <div className="flex-grow bg-slate-50 rounded-[1.5rem] p-8 border-2 border-dashed border-slate-200 min-h-[200px] flex items-center justify-center">
                      {isAnalysing ? (
                        <Loader2 className="animate-spin text-rose-600" size={32} />
                      ) : aiResponse?.type === 'poll' ? (
                        <div className="text-left w-full">
                          <p className="text-sm font-black mb-4 whitespace-pre-wrap">{String(aiResponse.content)}</p>
                          <div className="space-y-2">
                             <div className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold">선택지 1</div>
                             <div className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs text-center font-bold">선택지 2</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-bold uppercase">투표 생성 버튼을 누르세요</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-10 animate-in">
              <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h3 className="text-xl font-black mb-10">Live System Architecture</h3>
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative">
                  <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                  {[
                    { title: "Sources", icon: Globe, color: "bg-blue-500" },
                    { title: "Kafka Buffer", icon: RefreshCcw, color: "bg-indigo-500" },
                    { title: "Spark/NLP", icon: Zap, color: "bg-amber-500" },
                    { title: "Vector DB", icon: Database, color: "bg-emerald-500" }
                  ].map((step, i) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={i} className="relative z-10 w-full md:w-1/4 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center group">
                        <div className={`w-16 h-16 rounded-[1.5rem] ${step.color} text-white flex items-center justify-center mb-6 shadow-2xl`}>
                          <StepIcon size={24} />
                        </div>
                        <h5 className="font-black text-sm text-slate-900">{step.title}</h5>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-emerald-400 font-mono text-xs max-h-64 overflow-y-auto no-scrollbar">
                <div className="flex items-center gap-2 mb-4 text-slate-500"><Terminal size={16}/> LIVE PIPELINE LOGS</div>
                {logs.map((log, i) => (
                  <div key={i} className="mb-1">[{new Date().toLocaleTimeString()}] {String(log)}</div>
                ))}
                <div ref={logEndRef}></div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-10 animate-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="eCTR" value="34.8%" change="+8.2%" icon={Zap} color="bg-indigo-500" />
                <StatCard title="체류시간" value="8분 42초" change="+1.5%" icon={Activity} color="bg-rose-500" />
                <StatCard title="바이럴 공유" value="12.4k" change="+34.0%" icon={Share} color="bg-amber-500" />
                <StatCard title="정밀도" value="96.5%" change="+2.1%" icon={Activity} color="bg-emerald-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
                  <Line
                    data={{
                      labels: ['00', '04', '08', '12', '16', '20', '24'],
                      datasets: [{
                        label: 'Traffic',
                        data: [20, 10, 85, 45, 60, 95, 40],
                        borderColor: '#4F46E5',
                        fill: true,
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        tension: 0.4
                      }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 h-80">
                  <Radar
                    data={{
                      labels: ['정치', '경제', '기술', '사회', '연예', '스포츠'],
                      datasets: [{
                        label: 'Intensity',
                        data: [65, 90, 85, 45, 30, 70],
                        backgroundColor: 'rgba(225, 29, 72, 0.2)',
                        borderColor: '#E11D48',
                      }]
                    }}
                    options={{ maintainAspectRatio: false, scales: { r: { beginAtZero: true, suggestedMax: 100 } } }}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={apiKey ? () => setIsKeyModalOpen(false) : null}
        onSave={handleSaveKey}
      />

      {toast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-[2rem] shadow-2xl font-black text-sm animate-bounce z-50">
          {String(toast)}
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default App;
