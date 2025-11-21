import React, { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessToastProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
  duration?: number;
}

const SuccessToast: React.FC<SuccessToastProps> = ({
  isOpen,
  onClose,
  message = "¡Bienvenido! Has iniciado sesión exitosamente",
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setProgress(100);

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev - (100 / (duration / 50));
          return newProgress <= 0 ? 0 : newProgress;
        });
      }, 50);

      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => {
        clearInterval(progressInterval);
        clearTimeout(closeTimer);
      };
    }
  }, [isOpen, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-6 right-6 z-50">
      <div
        className={`bg-green-50 border border-green-200 rounded-xl shadow-lg min-w-[360px] max-w-md overflow-hidden transform transition-all duration-300 ${
          isVisible
            ? 'translate-x-0 opacity-100 scale-100'
            : 'translate-x-full opacity-0 scale-95'
        }`}
      >
        <div className="p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
          </div>

          <div className="flex-1 pt-0.5">
            <p className="text-green-900 font-medium text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="flex-shrink-0 text-green-600 hover:text-green-800 transition-colors p-1 hover:bg-green-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-1 bg-green-100">
          <div
            className="h-full bg-green-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default SuccessToast;
