import { useCallback, useState } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  image: File | null;
  previewUrl: string | null;
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  disabled?: boolean;
}

export function ImageUploader({
  image,
  previewUrl,
  onImageSelect,
  onImageRemove,
  disabled = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidImageFile(file)) {
        onImageSelect(file);
      }
    }
  }, [disabled, onImageSelect]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidImageFile(file)) {
        onImageSelect(file);
      }
    }
  }, [onImageSelect]);

  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('不支持的图片格式，请上传 JPG、PNG 或 WebP 格式的图片');
      return false;
    }

    if (file.size > maxSize) {
      alert('图片大小不能超过 10MB');
      return false;
    }

    return true;
  };

  if (image && previewUrl) {
    return (
      <div className="relative">
        <div className="relative rounded-lg border-2 border-dashed border-border/50 overflow-hidden bg-muted/20">
          <div className="aspect-video relative">
            <img
              src={previewUrl}
              alt="K线截图预览"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-background/90 text-xs font-medium text-foreground">
                <ImageIcon className="w-3 h-3 mr-1" />
                K线截图预览
              </span>
            </div>
            {!disabled && (
              <button
                onClick={onImageRemove}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 hover:bg-destructive hover:text-white transition-colors"
                aria-label="移除图片"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-colors cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-border/50 hover:border-primary/50 hover:bg-muted/20',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        aria-label="上传K线截图"
      />
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <div className={cn(
          'p-3 rounded-full mb-3',
          isDragging ? 'bg-primary/10' : 'bg-muted'
        )}>
          {disabled ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <Upload className={cn(
              'w-6 h-6 transition-colors',
              isDragging ? 'text-primary' : 'text-muted-foreground'
            )} />
          )}
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {disabled ? '上传中...' : '上传 K 线截图'}
        </p>
        <p className="text-xs text-muted-foreground">
          拖拽图片到此处，或{' '}
          <span className="text-primary font-medium">点击选择文件</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          支持 JPG、PNG、WebP，最大 10MB
        </p>
      </div>
    </div>
  );
}
