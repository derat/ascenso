# Locales

To add a new locale:

*   Create a new file in this directory containing string translations.
*   Update [src/plugins/i18n.ts](../plugins/i18n.ts) to import the translation
    file and pass it to the `VueI18n` object.
*   Add a flag image to [public/flags](../../public/flags).
*   Update [src/components/LocalePicker.vue](../components/LocalePicker.vue)
    to include a mapping from locale code to flag and name.
*   Update `VUE_APP_LOCALES` in your `.env` file to include the new locale. See
    [.env.example](../../.env.example) for details.
