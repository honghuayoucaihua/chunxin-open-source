import { useState } from 'react';
import { sanitize } from '../forumUtils';

export type UseForumCreateFormReturn = {
  forumNameInput: string;
  setForumNameInput: React.Dispatch<React.SetStateAction<string>>;
  selectedContactIds: string[];
  setSelectedContactIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMaskId: string;
  setSelectedMaskId: React.Dispatch<React.SetStateAction<string>>;
  selectedMaskIds: string[];
  setSelectedMaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  worldviewInput: string;
  setWorldviewInput: React.Dispatch<React.SetStateAction<string>>;
  selectedWorldBookIds: string[];
  setSelectedWorldBookIds: React.Dispatch<React.SetStateAction<string[]>>;
  tagInput: string;
  setTagInput: React.Dispatch<React.SetStateAction<string>>;
  tags: string[];
  setTags: React.Dispatch<React.SetStateAction<string[]>>;
  canCreateForum: boolean;
  resetCreateForm: () => void;
  toggleContactId: (id: string) => void;
  toggleWorldBook: (id: string) => void;
  addTag: () => void;
  removeTag: (tag: string) => void;
};

const useForumCreateForm = (): UseForumCreateFormReturn => {
  const [forumNameInput, setForumNameInput] = useState('');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedMaskId, setSelectedMaskId] = useState('');
  const [selectedMaskIds, setSelectedMaskIds] = useState<string[]>([]);
  const [worldviewInput, setWorldviewInput] = useState('');
  const [selectedWorldBookIds, setSelectedWorldBookIds] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const canCreateForum = forumNameInput.trim().length > 0;

  const resetCreateForm = () => {
    setForumNameInput('');
    setSelectedContactIds([]);
    setSelectedMaskId('');
    setSelectedMaskIds([]);
    setWorldviewInput('');
    setSelectedWorldBookIds([]);
    setTagInput('');
    setTags([]);
  };

  const toggleContactId = (id: string) => {
    setSelectedContactIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleWorldBook = (id: string) => {
    setSelectedWorldBookIds((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const addTag = () => {
    const t = sanitize(tagInput);
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  return {
    forumNameInput,
    setForumNameInput,
    selectedContactIds,
    setSelectedContactIds,
    selectedMaskId,
    setSelectedMaskId,
    selectedMaskIds,
    setSelectedMaskIds,
    worldviewInput,
    setWorldviewInput,
    selectedWorldBookIds,
    setSelectedWorldBookIds,
    tagInput,
    setTagInput,
    tags,
    setTags,
    canCreateForum,
    resetCreateForm,
    toggleContactId,
    toggleWorldBook,
    addTag,
    removeTag
  };
};

export default useForumCreateForm;
