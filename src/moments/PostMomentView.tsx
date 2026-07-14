import React, { useState } from 'react';
import { Contact, UserProfile } from '../types';
import { MobileHeader } from '../Common';
import { compressImage } from '../services/imageService';
import { InlineOptionsList } from '../utils/UtilsContactFormPrimitives';

const MAX_MOMENT_IMAGES = 9;

export const PostMomentView: React.FC<{
  user: UserProfile,
  onBack: () => void,
  onPost: (text: string, images: string[], location: string, visibility: string, imageDescriptions?: string[], identityContactId?: string) => void,
  onSelectContacts?: () => void,
  selectedContacts?: string[],
  disableImageDescription?: boolean,
  contacts?: Contact[],
  onRemindWhoPostPicker?: () => void,
  onSelectIdentityPicker?: () => void
}> = ({ user, onBack, onPost, onSelectContacts, selectedContacts = [], disableImageDescription = false, contacts = [], onRemindWhoPostPicker, onSelectIdentityPicker }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageDescriptions, setImageDescriptions] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [visibility, setVisibility] = useState('公开');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showVisibilitySelect, setShowVisibilitySelect] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedIdentityId = (window as any).selectedIdentityId as string | undefined;
  const selectedIdentityContact = selectedIdentityId
    ? contacts.find(c => c.id === selectedIdentityId) || null
    : null;

  const remainingImageSlots = Math.max(0, MAX_MOMENT_IMAGES - images.length);

  const appendImages = (newImages: string[]) => {
    if (!newImages.length) return;
    setImages(prev => {
      const merged = [...prev, ...newImages].slice(0, MAX_MOMENT_IMAGES);
      return merged;
    });
    setImageDescriptions(prev => {
      const next = [...prev];
      while (next.length < images.length + newImages.length) next.push('');
      return next.slice(0, MAX_MOMENT_IMAGES);
    });
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const removeImageAt = (index: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== index));
    setImageDescriptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateImageDescription = (index: number, value: string) => {
    setImageDescriptions(prev => {
      const next = [...prev];
      while (next.length < images.length) next.push('');
      next[index] = value;
      return next;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) {
      const picked = files.slice(0, remainingImageSlots);
      const nextImages: string[] = [];
      try {
        for (const file of picked) {
          const dataUrl = await compressImage(file);
          nextImages.push(dataUrl);
        }
        appendImages(nextImages);
      } catch (err) {
        console.error('图片压缩失败:', err);
      }
    }
  };

  const handleBack = () => {
    (window as any).selectedIdentityId = undefined;
    onBack();
  };

  return (
    <div className="fixed inset-0 z-[300] render-bg-secondary flex flex-col animate-in slide-in-from-bottom duration-300">
      <MobileHeader
        title=""
        onBack={handleBack}
        actions={<button className={`app-button whitespace-nowrap ${text.trim() || images.length > 0 ? 'app-button-primary' : 'app-button-muted opacity-60 cursor-not-allowed'}`} disabled={!text.trim() && images.length === 0} onClick={() => onPost(text, images, location, visibility, disableImageDescription ? [] : imageDescriptions, selectedIdentityId)}>发表</button>}
      />
      <div className="p-4 flex-1 overflow-y-auto">
        <textarea
          autoFocus
          className="app-field-textarea app-field-textarea--bare w-full h-32 text-[17px]"
          placeholder="这一刻的想法..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2 mt-4">
          {images.map((img, i) => (
            <div key={i}>
              <div className="relative aspect-square">
                <img
                  src={img}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover rounded-sm cursor-zoom-in moments-draft-image"
                  onClick={() => setPreviewImageUrl(img)}
                />
                <button className="app-icon-button absolute -top-2 -right-2 w-5 h-5 rounded-full text-xs bg-black/50 text-white" onClick={() => removeImageAt(i)}>×</button>
              </div>
              {!disableImageDescription && (
                <input
                  className="app-field-input app-field-input--soft mt-1 w-full text-[12px] px-2 py-1"
                  placeholder="图片描述"
                  value={imageDescriptions[i] || ''}
                  onChange={(e) => updateImageDescription(i, e.target.value)}
                />
              )}
            </div>
          ))}
          {images.length < MAX_MOMENT_IMAGES && (
            <div className="app-surface-panel app-surface-panel--soft aspect-square flex items-center justify-center text-gray-400 text-3xl cursor-pointer" onClick={handleAddImage}>
              <i className="fa-solid fa-plus"></i>
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />

        <div className="mt-8 app-surface-panel app-surface-panel--soft overflow-hidden">
           <div className="app-list-item app-list-item--soft app-list-item--moment-setting cursor-pointer" onClick={() => setShowLocationInput(!showLocationInput)}>
              <div className="app-list-item-main">
                 <div className="app-list-item-title flex items-center gap-3">
                   <i className="fa-solid fa-location-dot text-gray-400"></i>
                   <span>{location || '所在位置'}</span>
                 </div>
              </div>
              <div className="app-list-item-side">
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
           </div>

           {showLocationInput && (
             <div className="p-3 pt-0 animate-in fade-in slide-in-from-top-2">
                <input
                  autoFocus
                  className="app-field-input app-field-input--soft w-full p-3"
                  placeholder="请输入位置名称"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setShowLocationInput(false)}
                />
             </div>
           )}

           <div className="app-list-item app-list-item--soft app-list-item--moment-setting cursor-pointer" onClick={() => setShowVisibilitySelect(!showVisibilitySelect)}>
              <div className="app-list-item-main">
                 <div className="app-list-item-title flex items-center gap-3">
                   <i className="fa-solid fa-user-group text-gray-400"></i>
                   <span>谁可以看</span>
                 </div>
              </div>
              <div className="app-list-item-side flex items-center space-x-2">
                 <span className="render-text-secondary text-[14px]">{visibility === '部分可见' && selectedContacts.length > 0 ? `部分可见(${selectedContacts.length})` : visibility}</span>
                 <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
           </div>

           {showVisibilitySelect && (
             <div className="mx-3 mb-3 animate-in fade-in slide-in-from-top-2">
                <InlineOptionsList
                  options={['公开', '私密', '部分可见', '不给谁看']}
                  value={visibility}
                  variant="moment"
                  onSelect={(next) => {
                    setVisibility(next);
                    if (next === '部分可见' || next === '不给谁看') {
                      onSelectContacts?.();
                    } else {
                      setShowVisibilitySelect(false);
                    }
                  }}
                />
             </div>
           )}

           <div className="app-list-item app-list-item--soft app-list-item--moment-setting cursor-pointer">
              <div className="app-list-item-main">
                 <div className="app-list-item-title flex items-center gap-3">
                   <i className="fa-solid fa-at text-gray-400"></i>
                   <span>提醒谁看</span>
                 </div>
              </div>
              <div className="app-list-item-side">
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
           </div>

           <div className="app-list-item app-list-item--soft app-list-item--moment-setting cursor-pointer" onClick={() => onRemindWhoPostPicker?.()}>
              <div className="app-list-item-main">
                 <div className="app-list-item-title flex items-center gap-3">
                   <i className="fa-solid fa-bullhorn text-gray-400"></i>
                   <span>提醒谁发</span>
                 </div>
              </div>
              <div className="app-list-item-side">
                <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
           </div>

           <div className="app-list-item app-list-item--soft app-list-item--moment-setting cursor-pointer" onClick={() => onSelectIdentityPicker?.()}>
              <div className="app-list-item-main">
                 <div className="app-list-item-title flex items-center gap-3">
                   <i className="fa-solid fa-user-pen text-gray-400"></i>
                   <span>选择身份</span>
                 </div>
              </div>
              <div className="app-list-item-side flex items-center space-x-2">
                 {selectedIdentityContact && (
                   <>
                     <img src={selectedIdentityContact.avatar} className="w-5 h-5 rounded-full" />
                     <span className="render-text-secondary text-[14px]">{selectedIdentityContact.remark?.trim() || selectedIdentityContact.name}</span>
                   </>
                 )}
                 <i className="fa-solid fa-chevron-right text-gray-300 text-xs"></i>
              </div>
           </div>
        </div>
      </div>

      {previewImageUrl && (
        <div className="fixed inset-0 z-[560] bg-black/90 flex items-center justify-center" onClick={() => setPreviewImageUrl(null)}>
          <img
            src={previewImageUrl}
            className="max-w-[96vw] max-h-[96vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="app-icon-button absolute top-4 right-4 text-white text-xl w-9 h-9 rounded-full bg-black/40"
            onClick={() => setPreviewImageUrl(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
