# WP Media Picker

This jQuery plugin for WordPress can be used to transform an input field into a flexible and compatible media field with attachment selection and preview.

![Plugin Screenshot](https://raw.githubusercontent.com/felixarntz/wp-media-picker/master/screenshot.png)

## Features

* transforms a simple input field in the WordPress admin into a media picker with buttons to open the WordPress media modal
* handles the custom media modal behavior as well as how the value is stored in the input field (you're free to choose between ID and URL)
* renders a preview of the attachment if it is an image, video or audio file
* uses WordPress Core technology wherever possible
* fully compatible with WordPress Core media modal, so it can be used on post editing screens too
* customizable with numerous settings which can be defined in the function call or as data attributes
* since it only uses WordPress Core strings for the labels, it has probably been translated into your language already

## Installation and Setup

### Install the plugin

The preferred method to install this package is to use Bower.
`bower install felixarntz/wp-media-picker`

### Enqueue script and stylesheet

To include the script and stylesheet, enqueue the script and stylesheet like so:
```php
<?php
wp_enqueue_media();
wp_enqueue_script( 'wp-media-picker', 'PATHTOMEDIAPICKER/wp-media-picker.min.js', array( 'jQuery', 'media-editor' ), '0.1.0', true );
wp_enqueue_style( 'wp-media-picker', 'PATHTOMEDIAPICKER/wp-media-picker.min.css', array(), '0.1.0' );

```

Make sure to use the proper hook to enqueue the assets, for example in the `admin_enqueue_scripts` hook. Furthermore the dependencies in the above code sample must explicitly be included, otherwise the plugin will not work.

### Initialize the plugin on your fields

To turn your raw and boring input fields into really exciting media picker fields, you simply need to run the main plugin function `wpMediaPicker()` on your jQuery elements. For example:

```js
jQuery( '.custom-media-field' ).wpMediaPicker();
```

## Plugin Settings

The plugin supports numerous settings so that you can tweak how your fields work. There are two ways to apply settings to a field: Either specify the settings (as an object) when initializing the plugin in Javascript, or put the settings into a `data-settings` attribute on the field (in JSON format).

Here you find a list of all available settings:

`store`:
* Determines how the attachment is stored in the input field
* Accepts 'id' or 'url'
* Default: 'url'

`query`:
* Alters the attachments query in the media library (for example to only show images, use `{ post_mime_type: 'image' }`)
* Default: empty object

`filterable`:
* Whether the library is filterable, and if so what filters should be shown
* Accepts 'all', 'uploaded' or 'unattached'
* Default: 'all'

`searchable`:
* Whether the library is searchable
* Accepts a boolean
* Default: true

`editable`:
* Whether the library content is editable
* Accepts a boolean
* Default: false

`allowLocalEdits`:
* Whether the library content can be edited locally (only used if `editable` is false)
* Accepts a boolean
* Default: false

`displaySettings`:
* Whether to show the attachment display settings
* Accepts a boolean
* Default: false

`displayUserSettings`:
* Whether to update the user settings when editing attachment display settings
* Accepts a boolean
* Default: false

`label_add`:
* Sets the text for the add button on the field
* Accepts a string
* Default: 'Add Media'

`label_replace`:
* Sets the text for the replace button on the field
* Accepts a string
* Default: 'Replace'

`label_remove`:
* Sets the text for the remove button on the field
* Accepts a string
* Default: 'Remove'

`label_modal`:
* Sets the title text for the media modal
* Accepts a string
* Default: 'Add Media'

`label_button`:
* Sets the button text for the media modal
* Accepts a string
* Default: 'Add Media'

## Contribute

I'm always grateful for contributions, whether it is about enhancements or bugfixes, especially since the plugin is at an early stage. If you encounter bugs, compatibility issues or totally missing functionality that must be in this plugin, I would appreciate if you [created an issue](https://github.com/felixarntz/wp-media-picker/issues). Or even better, if you can, do it yourself and [open a pull-request](https://github.com/felixarntz/wp-media-picker/pulls).
