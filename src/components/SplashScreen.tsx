import { useEffect, useState } from 'react';
import splashImg from '@/assets/splash.png';

const LOADING_MESSAGES = [
  'Initialisation du système...',
  'Connexion à la base de données...',
  'Vérification des autorisations...',
  'Chargement des données SAMES...',
  'Synchronisation des modules...',
  'Finalisation de la configuration...',
  'Application prête.',
];

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const totalDuration = 2800; // ms
    const steps = 100;
    const interval = totalDuration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setProgress(currentStep);

      // Update message based on progress
      const msgStep = Math.floor((currentStep / steps) * (LOADING_MESSAGES.length - 1));
      setMsgIndex(Math.min(msgStep, LOADING_MESSAGES.length - 1));

      if (currentStep >= steps) {
        clearInterval(timer);
        // Wait briefly at 100%, then fade out
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, 500);
        }, 300);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0d0d14 60%, #060608 100%)',
      }}
    >
      {/* Ambient glow behind image */}
      <div
        className="absolute"
        style={{
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220,40,30,0.18) 0%, rgba(80,120,220,0.10) 50%, transparent 80%)',
          filter: 'blur(40px)',
          transform: 'translateY(-30px)',
          animation: 'splashPulse 2.5s ease-in-out infinite',
        }}
      />

      {/* Splash image */}
      <div
        className="relative mb-10"
        style={{ animation: 'splashFloat 3s ease-in-out infinite' }}
      >
        <img
          src={splashImg}
          alt="SAMES CI"
          className="w-64 h-64 sm:w-80 sm:h-80 object-contain select-none"
          draggable={false}
        />
      </div>

      {/* LOADING text */}
      <p
        className="tracking-[0.35em] text-sm font-semibold mb-5 uppercase"
        style={{
          color: '#c8c8d8',
          textShadow: '0 0 12px rgba(200,200,255,0.3)',
          letterSpacing: '0.35em',
        }}
      >
        CHARGEMENT...
      </p>

      {/* Progress bar container */}
      <div className="w-64 sm:w-80 relative">
        {/* Track */}
        <div
          className="w-full h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Fill */}
          <div
            className="h-full rounded-full transition-all duration-75 ease-linear"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #b83232 0%, #e84040 60%, #ff7070 100%)',
              boxShadow: '0 0 10px 2px rgba(232,64,64,0.7), 0 0 22px 4px rgba(180,30,30,0.4)',
            }}
          />
        </div>

        {/* Glowing dot at the tip of the bar */}
        {progress > 2 && progress < 100 && (
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              left: `calc(${progress}% - 5px)`,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#ff6060',
              boxShadow: '0 0 8px 4px rgba(255,80,80,0.8)',
              transition: 'left 75ms linear',
            }}
          />
        )}
      </div>

      {/* Status message */}
      <p
        className="mt-4 text-xs text-center px-6 max-w-xs"
        style={{
          color: 'rgba(180,185,200,0.7)',
          minHeight: '2em',
          transition: 'opacity 0.3s',
        }}
      >
        {LOADING_MESSAGES[msgIndex]}
      </p>

      {/* Version badge */}
      <p
        className="absolute bottom-6 right-6 text-[10px]"
        style={{ color: 'rgba(140,145,160,0.5)' }}
      >
        v1.0.0 SAMES CI
      </p>

      {/* Keyframe animations injected via style tag */}
      <style>{`
        @keyframes splashFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes splashPulse {
          0%, 100% { opacity: 0.7; transform: translateY(-30px) scale(1); }
          50% { opacity: 1; transform: translateY(-30px) scale(1.12); }
        }
      `}</style>
    </div>
  );
};
