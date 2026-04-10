import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  History, 
  Video, 
  Image as ImageIcon, 
  Upload, 
  Send, 
  Trash2, 
  Loader2, 
  Copy, 
  CheckCircle2,
  LogOut,
  User as UserIcon,
  Phone,
  Building2,
  Clock,
  Sparkles,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  getDocFromServer
} from 'firebase/firestore';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { db, auth } from './firebase';
import { generateVideoScript } from './services/geminiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// --- Types ---
interface ScriptHistory {
  id: string;
  companyName: string;
  hotline: string;
  style: string;
  duration: string;
  scriptContent: string;
  createdAt: any;
  mediaUrls?: string[];
}

// --- Constants ---
const WRITING_STYLES = [
  { value: 'professional', label: 'Chuyên nghiệp & Tin cậy' },
  { value: 'luxury', label: 'Sang trọng & Đẳng cấp' },
  { value: 'emotional', label: 'Ấm cúng & Gia đình' },
  { value: 'modern', label: 'Hiện đại & Tối giản' },
  { value: 'energetic', label: 'Năng động & Sáng tạo' },
  { value: 'minimalist', label: 'Tinh tế & Gọn gàng' },
];

const DURATIONS = [
  { value: '15s', label: '15 giây' },
  { value: '30s', label: '30 giây' },
  { value: '60s', label: '1 phút' },
  { value: '90s', label: '1 phút 30 giây' },
  { value: '120s', label: '2 phút' },
];

export default function App() {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScriptHistory[]>([]);
  const [activeTab, setActiveTab] = useState('generator');
  
  // Form state
  const [companyName, setCompanyName] = useState('');
  const [hotline, setHotline] = useState('');
  const [style, setStyle] = useState('professional');
  const [duration, setDuration] = useState('30s');
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string }[]>([]);
  const [generatedScript, setGeneratedScript] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Fetch History ---
  useEffect(() => {
    const q = query(
      collection(db, 'scripts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScriptHistory[];
      setHistory(data);
    }, (error) => {
      console.error('Firestore Error:', error);
      toast.error('Không thể tải lịch sử.');
    });

    return () => unsubscribe();
  }, []);

  // --- Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).map(file => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setMediaFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async () => {
    if (!companyName) {
      toast.error('Vui lòng nhập tên công ty.');
      return;
    }

    setLoading(true);
    try {
      const mediaData = await Promise.all(
        mediaFiles.map(async (m) => ({
          mimeType: m.file.type,
          data: await fileToBase64(m.file)
        }))
      );

      const script = await generateVideoScript({
        companyName,
        hotline,
        style,
        duration,
        mediaData
      });

      if (script) {
        setGeneratedScript(script);
        
        // Save to Firestore
        await addDoc(collection(db, 'scripts'), {
          userId: 'personal-user',
          companyName,
          hotline,
          style,
          duration,
          scriptContent: script,
          createdAt: serverTimestamp(),
          mediaUrls: []
        });

        toast.success('Đã tạo kịch bản thành công!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo kịch bản.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ tạm!');
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'scripts', id));
      toast.success('Đã xóa lịch sử.');
    } catch (error) {
      console.error(error);
      toast.error('Không thể xóa.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:block">Đình Hiển AI</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="bg-white border-primary/20 text-primary">Thương hiệu Đình Hiển</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="generator" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Tạo kịch bản</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Lịch sử</span>
              </TabsTrigger>
            </TabsList>
            
            {activeTab === 'generator' && (
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !companyName}
                className="w-full sm:w-auto shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo kịch bản mới
                  </>
                )}
              </Button>
            )}
          </div>

          <TabsContent value="generator" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-5 space-y-6">
                <Card className="border-none shadow-xl shadow-slate-200/50">
                  <CardHeader>
                    <CardTitle className="text-xl">Thông tin kịch bản</CardTitle>
                    <CardDescription>Điền các thông tin cơ bản để AI hiểu rõ yêu cầu của bạn.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="company" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        Tên công ty / Thương hiệu
                      </Label>
                      <Input 
                        id="company" 
                        placeholder="Ví dụ: Công ty TNHH ABC" 
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="bg-slate-50/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hotline" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-400" />
                        Hotline liên hệ
                      </Label>
                      <Input 
                        id="hotline" 
                        placeholder="Ví dụ: 0901 234 567" 
                        value={hotline}
                        onChange={(e) => setHotline(e.target.value)}
                        className="bg-slate-50/50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-slate-400" />
                          Phong cách
                        </Label>
                        <Select value={style} onValueChange={setStyle}>
                          <SelectTrigger className="bg-slate-50/50">
                            <SelectValue placeholder="Chọn phong cách" />
                          </SelectTrigger>
                          <SelectContent>
                            {WRITING_STYLES.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Thời lượng
                        </Label>
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger className="bg-slate-50/50">
                            <SelectValue placeholder="Chọn thời lượng" />
                          </SelectTrigger>
                          <SelectContent>
                            {DURATIONS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Upload className="w-4 h-4 text-slate-400" />
                        Đính kèm hình ảnh/video
                      </Label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          multiple 
                          accept="image/*,video/*"
                          onChange={handleFileChange}
                        />
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <Plus className="w-5 h-5 text-slate-500" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Nhấn để tải lên hoặc kéo thả</p>
                        <p className="text-xs text-slate-400 mt-1">Hỗ trợ ảnh và video (Tối đa 10 file)</p>
                      </div>

                      {mediaFiles.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          {mediaFiles.map((file, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-slate-100">
                              {file.file.type.startsWith('image/') ? (
                                <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-6 h-6 text-slate-400" />
                                </div>
                              )}
                              <button 
                                onClick={() => removeFile(idx)}
                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Result Section */}
              <div className="lg:col-span-7">
                <Card className="h-full border-none shadow-xl shadow-slate-200/50 flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-xl">Nội dung lời bình (Voiceover)</CardTitle>
                      <CardDescription>Copy nội dung này vào công cụ tạo giọng nói AI của bạn.</CardDescription>
                    </div>
                    {generatedScript && (
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedScript)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Sao chép
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[500px] lg:h-[600px] p-6">
                      {generatedScript ? (
                        <div className="prose prose-slate max-w-none">
                          <div className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                            {generatedScript}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40 py-20">
                          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                            <FileText className="w-10 h-10 text-slate-400" />
                          </div>
                          <p className="text-slate-500 max-w-[200px]">
                            Chưa có kịch bản nào được tạo. Hãy điền thông tin và nhấn nút tạo.
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {history.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="h-full border-none shadow-lg hover:shadow-xl transition-shadow group overflow-hidden">
                      <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-bold text-lg line-clamp-1">{item.companyName}</h3>
                            <p className="text-xs text-slate-400">
                              {item.createdAt?.toDate().toLocaleString('vi-VN')}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-slate-400 hover:text-red-500"
                            onClick={() => deleteHistoryItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                            {WRITING_STYLES.find(s => s.value === item.style)?.label || item.style}
                          </Badge>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal">
                            {item.duration}
                          </Badge>
                        </div>

                        <Separator className="bg-slate-100" />

                        <div className="relative">
                          <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed italic">
                            "{item.scriptContent}"
                          </p>
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button 
                            className="flex-1" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setGeneratedScript(item.scriptContent);
                              setCompanyName(item.companyName);
                              setHotline(item.hotline);
                              setStyle(item.style);
                              setDuration(item.duration);
                              setActiveTab('generator');
                            }}
                          >
                            Xem chi tiết
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => copyToClipboard(item.scriptContent)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {history.length === 0 && (
                <div className="col-span-full py-20 text-center space-y-4 opacity-40">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <History className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-500">Bạn chưa có lịch sử tạo kịch bản nào.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
