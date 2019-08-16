const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ru', 'zh', 'pt', 'ar', 'ja', 'ko', 'mul'];

/**
 * Language can be set dynamically with `.setLanguage(lang)` method.
 * @param {object} options
 * @param {array} [options.supportedLanguages] - (Supported languages)[https://docs.mapbox.com/help/troubleshooting/change-language/]
 * @param {string} [options.language] - One of the supported languages to apply
 * @param {array} [options.excludedLayerIds=[]] - Array of layer id to exclude from localization
 * @param {function} [options.getLanguageField] - Accepts language and returns language field.
 * By default fields are `name_LANGUAGE` and `name` for multi language (mul).
 */

class Language {
  constructor(options = {}) {
    this.supportedLanguages = options.supportedLanguages || SUPPORTED_LANGUAGES;
    this.language = options.language;
    this.getLanguageField = options.getLanguageField || getLanguageField;
    this.excludedLayerIds = options.excludedLayerIds || [];
    this.styleChangeListener = this.styleChangeListener.bind(this);
  }

  onAdd(map) {
    this.map = map;
    this.map.on('styledata', this.styleChangeListener);
    this.container = document.createElement('div');
    return this.container;
  }

  onRemove() {
    this.map.off('styledata', this.styleChangeListener);
    this.map = undefined;
  }

  styleChangeListener() {
    this.map.off('styledata', this.styleChangeListener);
    this.setLanguage(this.language);
  }

  setLanguage(language = this.browserLanguage()) {
    if (this.supportedLanguages.indexOf(language) < 0) {
      throw new Error(`Language ${language} is not supported`);
    }

    const style = this.map.getStyle();
    const languageField = this.getLanguageField(language);
    const layers = style.layers.map((layer) => {
      if (layer.type !== 'symbol') return layer;
      if (!layer.layout || !layer.layout['text-field']) return layer;
      if (this.excludedLayerIds.indexOf(layer.id) !== -1) return layer;

      const textField = layer.layout['text-field'];
      const textFieldLocalized = localizeTextField(textField, languageField);

      return {
        ...layer,
        layout: {
          ...layer.layout,
          'text-field': textFieldLocalized,
        },
      };
    });

    this.map.setStyle({
      ...style,
      layers,
    });
  }

  browserLanguage() {
    const language = navigator.languages ? navigator.languages[0] : navigator.language;
    const parts = language.split('-');
    const languageCode = parts.length > 1 ? parts[0] : language;
    if (this.supportedLanguages.indexOf(languageCode) > -1) {
      return languageCode;
    }
    return null;
  }
}

export default Language;

function getLanguageField(lang) {
  if (lang === 'mul') {
    return 'name';
  }
  return `name_${lang}`;
}

function localizeTextField(field, lang) {
  if (typeof field === 'string') {
    return field.replace(/{name.*?}/, `{${lang}}`);
  }

  const str = JSON.stringify(field);

  if (Array.isArray(field)) {
    return JSON.parse(str.replace(
      /"coalesce",\["get","name.*?"]/g,
      `"coalesce",["get","${lang}"]`,
    ));
  }

  return JSON.parse(str.replace(
    /{name.*?}/g,
    `{${lang}}`,
  ));
}