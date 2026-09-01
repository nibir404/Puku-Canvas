import { useState, useEffect } from 'react';
import { Share2, Copy, Check, X, Globe, Link as LinkIcon } from 'lucide-react';
import { useCanvasStore } from '../../store/canvas-store';
import { encodeSceneToUrl } from '../../lib/share';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const scene = useCanvasStore((s) => s.scene);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (open) {
      const url = encodeSceneToUrl(scene);
      setShareUrl(url);
      window.history.replaceState(null, '', url);
    }
  }, [open, scene]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.getElementById('share-url-input') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: scene.name || 'Puku Canvas',
        text: 'Check out this canvas on Puku Canvas!',
        url: shareUrl,
      }).catch(() => {});
    }
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div
        className="share-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="share-modal-header">
          <div className="share-modal-title">
            <Share2 className="h-5 w-5 text-primary" />
            <h3>Share Canvas</h3>
          </div>
          <button type="button" className="share-modal-close" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="share-modal-body">
          <div className="share-info-card">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="share-info-text">
              <strong>Anyone with the link</strong>
              <p>Can view and edit a live copy of this canvas</p>
            </div>
          </div>

          <div className="share-input-group">
            <div className="share-input-wrapper">
              <LinkIcon className="h-4 w-4 text-muted-foreground ml-3 flex-shrink-0" />
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                className="share-url-input"
              />
            </div>
            <button
              type="button"
              className={`share-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              className="share-native-btn"
              onClick={handleNativeShare}
            >
              <Share2 className="h-4 w-4" />
              <span>Share via app...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
