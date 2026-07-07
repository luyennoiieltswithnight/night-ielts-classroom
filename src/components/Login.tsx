import { motion } from "motion/react";
import { LogIn, BookOpen, TrendingUp, Sparkles, Heart } from "lucide-react";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Mascot } from "./ui/Mascot";

interface LoginProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string | null;
}

export function Login({ onLogin, isLoading, error }: LoginProps) {
  return (
    <div className="min-h-screen bg-pastel-green-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-pastel-green-200 rounded-full blur-[120px] opacity-40 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-[30rem] h-[30rem] bg-pastel-blue-200 rounded-full blur-[150px] opacity-40 animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-pastel-yellow-100 rounded-full blur-[180px] opacity-30" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-lg w-full space-y-10 relative z-10"
      >
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ rotate: -10 }}
            animate={{ rotate: 10 }}
            transition={{ repeat: Infinity, duration: 2, repeatType: "reverse", ease: "easeInOut" }}
            className="inline-block"
          >
            <Mascot mood="happy" size="lg" className="drop-shadow-2xl" />
          </motion.div>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-20 h-20 bg-pastel-green-500 rounded-3xl flex items-center justify-center shadow-xl shadow-pastel-green-100 overflow-hidden">
                <Mascot size="md" className="scale-125 translate-y-2" />
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-tight">Study English <br/><span className="text-pastel-green-500">with Mr. Night</span></h1>
              </div>
            </div>
            <p className="text-pastel-green-700 text-xl font-bold tracking-tight">
              Your cute AI English learning companion!
            </p>
          </div>
        </div>

        <Card className="p-12 space-y-10 shadow-2xl border-4 border-white bg-white/80 backdrop-blur-xl rounded-[3.5rem]">
          <div className="space-y-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold text-center"
              >
                {error}
              </motion.div>
            )}
            <FeatureItem 
              icon={<Sparkles className="w-6 h-6 text-pastel-yellow-500" />} 
              title="AI Magic Extraction" 
              desc="Turn images and PDFs into fun vocabulary lists instantly." 
              bgColor="bg-pastel-yellow-50"
            />
            <FeatureItem 
              icon={<Heart className="w-6 h-6 text-pastel-pink-500" />} 
              title="Spaced Repetition" 
              desc="Scientific review schedules that help you remember forever." 
              bgColor="bg-pastel-pink-50"
            />
            <FeatureItem 
              icon={<TrendingUp className="w-6 h-6 text-pastel-blue-500" />} 
              title="Visual Progress" 
              desc="Watch your vocabulary garden grow every single day." 
              bgColor="bg-pastel-blue-50"
            />
          </div>

          <div className="pt-4">
            <Button 
              className="w-full py-10 text-2xl font-black gap-4 bg-pastel-green-500 hover:bg-pastel-green-600 shadow-2xl shadow-pastel-green-100 border-none rounded-[2.5rem] transition-all hover:scale-105 active:scale-95" 
              onClick={onLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-7 h-7" /> Let's Start!
                </>
              )}
            </Button>
            
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-center text-xs font-black text-gray-300 uppercase tracking-[0.3em]">
                Designed with love for students
              </p>
              <p className="text-[10px] text-gray-400 font-medium text-center">
                If you have trouble staying logged in, try opening the app in a new tab.
              </p>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-pastel-green-600 font-bold text-lg">
            Join the flow and master IELTS Speaking! 🚀
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureItem({ icon, title, desc, bgColor }: { icon: React.ReactNode, title: string, desc: string, bgColor: string }) {
  return (
    <div className="flex gap-6 items-center group">
      <div className={`flex-shrink-0 w-14 h-14 ${bgColor} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-black text-gray-900 tracking-tight">{title}</h3>
        <p className="text-sm text-gray-500 font-semibold leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
