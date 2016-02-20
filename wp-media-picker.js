/*
 * WP Media Picker -  version 0.2.0
 *
 * Felix Arntz <felix-arntz@leaves-and-love.net>
 */

( function( $, wp ) {

	if ( typeof $.fn.wpMediaPicker !== 'undefined' ) {
		// if the jQuery plugin is already defined, abort
		return;
	}

	if ( typeof wp === 'undefined' || typeof wp.media === 'undefined' ) {
		// if wp.media is not loaded, scaffold the jQuery plugin function and abort
		$.fn.wpMediaPicker = function() {
			return this;
		};

		console.error( 'WP Media not found' );
		return;
	}

	/**
	 * Stores the original WordPress Core function for sending an attachment to the editor
	 *
	 * @type function
	 */
	var _orig_send_attachment = wp.media.editor.send.attachment;

	/**
	 * Stores the original global send_to_editor function which might be defined by a plugin
	 *
	 * @type function|undefined
	 */
	var _orig_send_to_editor = window.send_to_editor;

	/**
	 * Overrides the default send_to_editor function.
	 *
	 * Since WPMediaPicker uses this function to send HTML content to the preview div, we need to adjust this.
	 *
	 * @param string html the output to send
	 */
	var sendToEditor = function( html ) {
		var wpActiveEditor = window.wpActiveEditor;

		document.getElementById( wpActiveEditor ).innerHTML = html;

		// always reset it back to the original after being executed
		window.send_to_editor = _orig_send_to_editor;
	};

	/**
	 * Returns the preview HTML output for an attachment.
	 *
	 * @param object attachment the attachment object to generate output for
	 * @return string HTML output to send to the preview div
	 */
	var getMediaContent = function( attachment ) {
		var output = '';

		if ( 'image' === attachment.type ) {
			// for image attachments, show the image
			var src = attachment.url;
			if ( attachment.sizes && attachment.sizes.large ) {
				src = attachment.sizes.large.url;
			} else if ( attachment.sizes && attachment.sizes.full ) {
				src = attachment.sizes.full.url;
			}
			output += '<img src="' + src + '" alt="' + attachment.alt + '" />';
		} else if ( 'video' === attachment.type ) {
			// for video attachments, show the video player, optionally with the poster
			var poster = '';
			if ( attachment.image && attachment.image.src !== attachment.icon ) {
				poster = attachment.image.src;
			}
			output += '<video class="wp-video-shortcode" preload="metadata"' + ( poster ? ' poster="' + poster + '"' : '' ) + ' controls><source type="' + attachment.mime + '" src="' + attachment.url + '" /></video>';
		} else if ( 'audio' === attachment.type ) {
			// for audio attachments, show the audio player, with either the cover or the mime type icon
			if ( attachment.image && attachment.image.src && attachment.image.src !== attachment.icon ) {
				output += '<img class="wp-audio-cover" src="' + attachment.image.src + '" alt="' + attachment.filename + '" />';
			} else {
				output += '<div class="mime-type-icon"><img src="' + attachment.icon + '" /><span>' + attachment.filename + '</span></div>';
			}
			output += '<audio class="wp-audio-shortcode" width="100%" preload="none" controls><source type="' + attachment.mime + '" src="' + attachment.url + '" /></audio>';
		} else {
			// if neither of the above formats, just show a mime type icon with the filename
			output += '<div class="mime-type-icon"><img src="' + attachment.icon + '" /><span>' + attachment.filename + '</span></div>';
		}

		return output;
	};

	/**
	 * Generates the basic plugin markup.
	 *
	 * This function is called when initializing the plugin on an element.
	 *
	 * @param jQuery $elem the input field to generate the markup for
	 * @param object settings the settings for the input field
	 * @param string media_content the preview HTML output for the field's attachment (optional)
	 */
	var generateMarkup = function( $elem, settings, media_content ) {
		var input_id = $elem.attr( 'id' );
		var button_text = media_content ? settings.label_replace : settings.label_add;
		var remove_button_text = settings.label_remove;

		if ( ! media_content ) {
			media_content = '';
		}

		var content_class = 'wp-mediapicker-content';
		if ( 0 === media_content.search( '<img' ) ) {
			content_class += ' size-auto';
		}

		$elem
			.hide()
			.after(
				'<a data-input-id="' + input_id + '" class="wp-mediapicker-button button" href="#">' + button_text + '</a>',
				'<a data-input-id="' + input_id + '" class="wp-mediapicker-remove-button" href="#"' + ( media_content ? '' : ' style="display:none;"' ) + '>' + remove_button_text + '</a>',
				'<div class="wp-mediapicker-content-wrap"><div id="wp-mediapicker-content-' + input_id + '" class="' + content_class + '"' + ( media_content ? '' : ' style="display:none;"' ) + '>' + ( media_content ? media_content : '' ) + '</div></div>'
			)
			.next( '.wp-mediapicker-button' ).data( 'settings', settings );
	};

	/**
	 * Overrides the WordPress Core function to send an attachment from the media modal to the input field.
	 *
	 * This function assigns the attachment ID or URL respectively to the input field.
	 * Then it generates the preview content for the field and returns it.
	 *
	 * It is compatible with the original function: if the current modal is not a modal added by WPMediaPicker, the original function is executed instead.
	 *
	 * @param object props attachment properties
	 * @param object attachment the attachment object to send to the field
	 * @return string HTML content to send to the preview field
	 */
	wp.media.editor.send.attachment = function( props, attachment ) {
		var wpActiveEditor;
		if ( wp.media.editor.activeEditor ) {
			wpActiveEditor = wp.media.editor.activeEditor;
		} else {
			wpActiveEditor = window.wpActiveEditor || '';
		}
		if ( 0 === wpActiveEditor.search( 'wp-mediapicker-content-' ) ) {
			var content_id = wpActiveEditor;
			var input_id = content_id.substring( 'wp-mediapicker-content-'.length );

			var controller = $( '#' + input_id ).data( 'wp-media-picker' );
			if ( 'object' !== typeof controller ) {
				console.error( 'Invalid input ID' );
				return '';
			}

			controller.send_attachment( attachment );

			window.send_to_editor = sendToEditor;

			return getMediaContent( attachment );
		} else {
			return _orig_send_attachment.apply( this, [ props, attachment ] );
		}
	};

	function WPMediaPicker( $elem, settings ) {
		this.$elem = $elem;
		this.settings = settings;
	}

	WPMediaPicker.prototype = {
		init: function() {
			var id = this.$elem.attr( 'id' );
			var $button = this.$elem.next( '.wp-mediapicker-button' );
			var $remove_button = $button.next( '.wp-mediapicker-remove-button' );
			var $content = $remove_button.next().find( '.wp-mediapicker-content' );

			this.workflow = wp.media.editor.add( id, {
				frame: 'select',
				state: 'insert',
				states: [
					new wp.media.controller.Library({
						id:         'insert',
						title:      this.settings.label_modal,
						priority:   20,
						toolbar:    'select',
						filterable: this.settings.filterable,
						library:    wp.media.query( this.settings.query ),
						multiple:   false,
						editable:   this.settings.editable,
						allowLocalEdits: this.settings.allowLocalEdits,
						displaySettings: this.settings.displaySettings,
						displayUserSettings: this.settings.displayUserSettings
					})
				],
				button: {
					event: 'insert',
					text: this.settings.label_button
				}
			});

			var self = this;

			$button.on( 'click', function( e ) {
				e.preventDefault();

				wp.media.editor.open( id );
			});

			$remove_button.on( 'click', function( e ) {
				e.preventDefault();

				self.$elem.val( null );

				if ( 'function' === typeof this.settings.clear ) {
					this.settings.clear.call( this );
				}

				$button.text( self.settings.label_add );
				$content.hide().empty();

				$remove_button.hide();
			});
		},

		send_attachment: function( attachment ) {
			var $button = this.$elem.next( '.wp-mediapicker-button' );
			var $remove_button = $button.next( '.wp-mediapicker-remove-button' );
			var $content = $remove_button.next().find( '.wp-mediapicker-content' );

			switch ( this.settings.store ) {
				case 'url':
					this.value( attachment.url );
					break;
				case 'ID':
				case 'id':
					this.value( attachment.id );
					break;
				default:
					this.value( attachment.id );
			}

			if ( 'function' === typeof this.settings.change ) {
				this.settings.change.call( this );
			}

			$button.text( this.settings.label_replace );
			$remove_button.show();

			if ( 'image' === attachment.type ) {
				$content.addClass( 'size-auto' );
			} else {
				$content.removeClass( 'size-auto' );
			}
			$content.show();
		},

		value: function( value ) {
			if ( 'undefined' === value ) {
				return this.$elem.val();
			}

			this.$elem.val( value );
		},

		setting: function( key, value ) {
			if ( 'object' === key ) {
				$.extend( this.settings, key );
				return;
			}

			if ( 'undefined' === value ) {
				return this.settings[ key ];
			}

			this.settings[ key ] = value;
		}
	};

	/**
	 * Initializes the plugin on one or more fields.
	 *
	 * This is the actual jQuery plugin function.
	 *
	 * In addition to providing settings in the function call, it is also possible to store field-related settings in a field directly.
	 * It has to be valid JSON and it must be stored in a 'data-settings' attribute.
	 *
	 * @param object settings custom settings for the field (all optional)
	 * @return jQuery
	 */
	$.fn.wpMediaPicker = function( settings ) {
		if ( $( this ).data( 'wp-media-picker' ) ) {
			var controller = $( this ).data( 'wp-media-picker' );
			var arg;

			if ( 'value' === settings ) {
				arg = Array.prototype.slice.call( arguments, 1 );
				return controller.value( arg );
			} else if ( 'object' === typeof settings ) {
				return controller.setting( settings );
			} else if ( 'string' === typeof settings ) {
				arg = Array.prototype.slice.call( arguments, 1 );
				return controller.setting( settings, arg );
			}

			return;
		}

		settings = $.extend({
			store: 'id',
			query: {},
			filterable: 'all',
			searchable: true,
			editable:   false,
			allowLocalEdits: false,
			displaySettings: false,
			displayUserSettings: false,
			change: false,
			clear: false,
			label_add: wp.media.view.l10n.addMedia,
			label_replace: wp.media.view.l10n.replace,
			label_remove: wp.media.view.l10n.remove,
			label_modal: wp.media.view.l10n.addMedia,
			label_button: wp.media.view.l10n.addMedia
		}, settings || {});

		return this.each( function() {
			var $elem = $( this );
			var elem_settings = $.extend({}, _settings );
			var data_settings = $elem.data( 'settings' );

			if ( data_settings ) {
				if ( typeof data_settings === 'string' ) {
					try {
						data_settings = JSON.parse( data_settings );
					} catch ( err ) {
						console.error( err.message );
					}
				}
				if ( typeof data_settings === 'object' ) {
					elem_settings = $.extend( elem_settings, data_settings );
				}
			}

			var attachment = '';
			if ( 'url' === elem_settings.store ) {
				attachment = $elem.val();
			} else {
				attachment = parseInt( $elem.val(), 10 );
			}

			if ( attachment ) {
				// if an attachment is set, make an AJAX call to get the attachment data and generate the preview output
				if ( 'url' === elem_settings.store ) {
					wp.media.ajax({
						type: 'POST',
						data: {
							action: 'get-attachment-by-url',
							url: attachment
						},
						success: function( attachment ) {
							generateMarkup( $elem, elem_settings, getMediaContent( attachment ) );

							var elem_controller = new WPMediaPicker( $elem, elem_settings );
							elem_controller.init();

							$elem.data( 'wp-media-picker', elem_controller );
						},
						error: function() {
							$elem.val( null );
							generateMarkup( $elem, elem_settings );

							var elem_controller = new WPMediaPicker( $elem, elem_settings );
							elem_controller.init();

							$elem.data( 'wp-media-picker', elem_controller );
						}
					});
				} else {
					wp.media.ajax({
						type: 'POST',
						data: {
							action: 'get-attachment',
							id: attachment
						},
						success: function( attachment ) {
							generateMarkup( $elem, elem_settings, getMediaContent( attachment ) );

							var elem_controller = new WPMediaPicker( $elem, elem_settings );
							elem_controller.init();

							$elem.data( 'wp-media-picker', elem_controller );
						},
						error: function() {
							$elem.val( null );
							generateMarkup( $elem, elem_settings );

							var elem_controller = new WPMediaPicker( $elem, elem_settings );
							elem_controller.init();

							$elem.data( 'wp-media-picker', elem_controller );
						}
					});
				}
			} else {
				// otherwise just generate the markup
				$elem.val( null );
				generateMarkup( $elem, elem_settings );

				var elem_controller = new WPMediaPicker( $elem, elem_settings );
				elem_controller.init();

				$elem.data( 'wp-media-picker', elem_controller );
			}
		});
	};
}( jQuery, wp ) );
