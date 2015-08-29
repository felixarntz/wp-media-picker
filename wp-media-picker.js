/*
 * WP Media Picker -  version 0.1.0
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

		$elem
			.hide()
			.after(
				'<a data-input-id="' + input_id + '" class="wp-mediapicker-button button" href="#">' + button_text + '</a>',
				'<a data-input-id="' + input_id + '" class="wp-mediapicker-remove-button" href="#"' + ( media_content ? '' : ' style="display:none;"' ) + '>' + remove_button_text + '</a>',
				'<div class="wp-mediapicker-content-wrap"><div id="wp-mediapicker-content-' + input_id + '" class="wp-mediapicker-content"' + ( media_content ? '' : ' style="display:none;"' ) + '>' + ( media_content ? media_content : '' ) + '</div></div>'
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

			var workflow = wp.media.editor.get( wpActiveEditor );
			var settings = workflow.options.mediapicker_settings || {};

			switch ( settings.store ) {
				case 'ID':
				case 'id':
					$( '#' + input_id ).val( attachment.id );
					break;
				case 'url':
					$( '#' + input_id ).val( attachment.url );
					break;
				default:
					$( '#' + input_id ).val( attachment.url );
			}

			$( '.wp-mediapicker-button[data-input-id="' + input_id + '"]' ).text( settings.label_replace );
			$( '.wp-mediapicker-remove-button[data-input-id="' + input_id + '"]' ).show();
			$( '#' + content_id ).show();

			window.send_to_editor = sendToEditor;

			return getMediaContent( attachment );
		} else {
			return _orig_send_attachment.apply( this, [ props, attachment ] );
		}
	};

	/**
	 * This anonymous function opens the media modal for a field (and creates it if it does not exist already).
	 *
	 * It is executed whenever the Add/Replace button is clicked.
	 *
	 * Since the usual WordPress media modal contains a lot of functionality that would be useless in case of WPMediaPicker,
	 * a custom type of modal is being used.
	 */
	$( document ).on( 'click', '.wp-mediapicker-button', function( e ) {
		var $this = $( this );
		var content_id = 'wp-mediapicker-content-' + $this.data( 'input-id' );
		var settings = $( this ).data( 'settings' );
		var workflow = wp.media.editor.get( content_id );

		e.preventDefault();

		if ( ! workflow ) {
			workflow = wp.media.editor.add( content_id, {
				frame: 'select',
				state: 'insert',
				states: [
					new wp.media.controller.Library({
						id:         'insert',
						title:      settings.label_modal,
						priority:   20,
						toolbar:    'select',
						filterable: settings.filterable,
						library:    wp.media.query( settings.query ),
						multiple:   false,
						editable:   settings.editable,
						allowLocalEdits: settings.allowLocalEdits,
						displaySettings: settings.displaySettings,
						displayUserSettings: settings.displayUserSettings
					})
				],
				button: {
					event: 'insert',
					text: settings.label_button
				},
				mediapicker_settings: settings
			});
		}

		wp.media.editor.open( content_id );
	});

	/**
	 * This anonymous function removes the attachment for a field.
	 *
	 * It is executed whenever the Remove button is clicked.
	 */
	$( document ).on( 'click', '.wp-mediapicker-remove-button', function( e ) {
		var $this = $( this );
		var input_id = $this.data( 'input-id' );
		var settings = $( '.wp-mediapicker-button[data-input-id="' + input_id + '"]' ).data( 'settings' );

		e.preventDefault();

		$( '#' + input_id ).val( null );

		$( '.wp-mediapicker-button[data-input-id="' + input_id + '"]' ).text( settings.label_add );
		$( '#wp-mediapicker-content-' + input_id ).hide().empty();

		$this.hide();
	});

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
		settings = $.extend({
			store: 'url',
			query: {},
			filterable: 'all',
			searchable: true,
			editable:   false,
			allowLocalEdits: false,
			displaySettings: false,
			displayUserSettings: false,
			label_add: wp.media.view.l10n.addMedia,
			label_replace: wp.media.view.l10n.replace,
			label_remove: wp.media.view.l10n.remove,
			label_modal: wp.media.view.l10n.addMedia,
			label_button: wp.media.view.l10n.addMedia
		}, settings || {});

		return this.each( function() {
			var $elem = $( this );
			var elem_settings = $.extend({}, settings );
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

			var attachment_id = parseInt( $elem.val(), 10 );

			if ( attachment_id ) {
				// if an attachment is set, make an AJAX call to get the attachment data and generate the preview output
				wp.media.ajax({
					type: 'POST',
					data: {
						action: 'get-attachment',
						id: attachment_id
					},
					success: function( attachment ) {
						generateMarkup( $elem, elem_settings, getMediaContent( attachment ) );
					},
					error: function() {
						$elem.val( null );
						generateMarkup( $elem, elem_settings );
					}
				});
			} else {
				// otherwise just generate the markup
				$elem.val( null );
				generateMarkup( $elem, elem_settings );
			}
		});
	};
}( jQuery, wp ) );
