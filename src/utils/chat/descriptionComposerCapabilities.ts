import type { Contact } from '../../types/contact';

export type DescriptionComposerAvailability = {
  featureEnabled: boolean;
  sayEnabled: boolean;
  doEnabled: boolean;
};

export const resolveDescriptionComposerAvailability = (
  contact: Pick<Contact, 'chatMode' | 'descriptionFeatureEnabled' | 'descriptionSayEnabled' | 'descriptionDoEnabled'>
): DescriptionComposerAvailability => {
  const isStory = contact.chatMode === 'story';
  const featureEnabled = !isStory && contact.descriptionFeatureEnabled === true;
  if (!featureEnabled) return { featureEnabled, sayEnabled: false, doEnabled: false };

  const defaultSayEnabled = contact.chatMode === 'online-inner' || contact.chatMode === 'offline-inner';
  const defaultDoEnabled = contact.chatMode === 'offline' || contact.chatMode === 'offline-inner';
  const sayEnabled = typeof contact.descriptionSayEnabled === 'boolean'
    ? contact.descriptionSayEnabled
    : defaultSayEnabled;
  const doEnabled = typeof contact.descriptionDoEnabled === 'boolean'
    ? contact.descriptionDoEnabled
    : defaultDoEnabled;

  const safeSayEnabled = sayEnabled || !doEnabled;
  const safeDoEnabled = doEnabled || !sayEnabled;
  return {
    featureEnabled,
    sayEnabled: safeSayEnabled,
    doEnabled: safeDoEnabled
  };
};
