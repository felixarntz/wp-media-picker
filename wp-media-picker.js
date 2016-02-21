/*
 * WP Media Picker -  version 0.2.0
 *
 * Felix Arntz <felix-arntz@leaves-and-love.net>
 */

( function( $, wp ) {

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
			var input_id = wpActiveEditor.substring( 'wp-mediapicker-content-'.length );

			window.send_to_editor = sendToEditor;

			return $( '#' + input_id ).wpMediaPicker( 'sendAttachment', attachment );
		} else {
			return _orig_send_attachment.apply( this, [ props, attachment ] );
		}
	};

	var _wrap = '<div class="wp-mediapicker-container" />';
	var _open_button = '<a class="wp-mediapicker-open-button button" />';
	var _remove_button = '<a class="wp-mediapicker-remove-button" />';
	var _content_wrap = '<div class="wp-mediapicker-content-wrap" />';
	var _content = '<div class="wp-mediapicker-content" />';

	var MediaPicker = {
		options: {
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
		},

		_create: function() {
			var self = this;

			$.extend( self.options, self.element.data() );

			self.content_id = 'wp-mediapicker-content-' + self.element.attr( 'id' );

			self.element.hide().wrap( _wrap );
			self.wrap = self.element.parent();
			self.open_button = $( _open_button ).insertAfter( self.element );
			self.remove_button = $( _remove_button ).insertAfter( self.open_button ).text( self.options.label_remove );
			self.content_wrap = $( _content_wrap ).insertAfter( self.remove_button );
			self.content = $( _content ).appendTo( self.content_wrap ).attr( 'id', self.content_id );

			self.workflow = wp.media.editor.add( self.content_id, {
				frame: 'select',
				state: 'insert',
				states: [
					new wp.media.controller.Library({
						id:         'insert',
						title:      self.options.label_modal,
						priority:   20,
						toolbar:    'select',
						filterable: self.options.filterable,
						library:    wp.media.query( self.options.query ),
						multiple:   false,
						editable:   self.options.editable,
						allowLocalEdits: self.options.allowLocalEdits,
						displaySettings: self.options.displaySettings,
						displayUserSettings: self.options.displayUserSettings
					})
				],
				button: {
					event: 'insert',
					text: self.options.label_button
				}
			});

			self._updateContent();

			self._addListeners();
		},

		_addListeners: function() {
			var self = this;

			self.open_button.on( 'click', function( e ) {
				e.preventDefault();

				self.open();
			});

			self.remove_button.on( 'click', function( e ) {
				e.preventDefault();

				self.element.val( null );

				self._resetContent();

				if ( 'function' === typeof self.options.clear ) {
					self.options.clear.call( self );
				}
			});
		},

		_createContent: function( attachment, return_content ) {
			var self = this;

			self.attachment = attachment;

			self.open_button.text( self.options.label_replace );
			self.remove_button.show();

			var preview_content = '';
			if ( 'image' === attachment.type ) {
				// for image attachments, show the image
				var src = attachment.url;
				if ( attachment.sizes && attachment.sizes.large ) {
					src = attachment.sizes.large.url;
				} else if ( attachment.sizes && attachment.sizes.full ) {
					src = attachment.sizes.full.url;
				}
				preview_content += '<img src="' + src + '" alt="' + attachment.alt + '" />';
			} else if ( 'video' === attachment.type ) {
				// for video attachments, show the video player, optionally with the poster
				var poster = '';
				if ( attachment.image && attachment.image.src !== attachment.icon ) {
					poster = attachment.image.src;
				}
				preview_content += '<video class="wp-video-shortcode" preload="metadata"' + ( poster ? ' poster="' + poster + '"' : '' ) + ' controls><source type="' + attachment.mime + '" src="' + attachment.url + '" /></video>';
			} else if ( 'audio' === attachment.type ) {
				// for audio attachments, show the audio player, with either the cover or the mime type icon
				if ( attachment.image && attachment.image.src && attachment.image.src !== attachment.icon ) {
					preview_content += '<img class="wp-audio-cover" src="' + attachment.image.src + '" alt="' + attachment.filename + '" />';
				} else {
					preview_content += '<div class="mime-type-icon"><img src="' + attachment.icon + '" /><span>' + attachment.filename + '</span></div>';
				}
				preview_content += '<audio class="wp-audio-shortcode" width="100%" preload="none" controls><source type="' + attachment.mime + '" src="' + attachment.url + '" /></audio>';
			} else {
				// if neither of the above formats, just show a mime type icon with the filename
				preview_content += '<div class="mime-type-icon"><img src="' + attachment.icon + '" /><span>' + attachment.filename + '</span></div>';
			}

			if ( 0 <= preview_content.search( '<img ' ) ) {
				self.content.addClass( 'size-auto' );
			} else {
				self.content.removeClass( 'size-auto' );
			}

			self.content.show();

			if ( return_content ) {
				return preview_content;
			}

			self.content.html( preview_content );
		},

		_resetContent: function() {
			var self = this;

			self.attachment = null;

			self.open_button.text( self.options.label_add );
			self.remove_button.hide();
			self.content.hide().empty().removeClass( 'size-auto' );
		},

		_updateContent: function() {
			var self = this;
			var val = self.element.val();

			if ( val ) {
				// if an attachment is set, make an AJAX call to get the attachment data and generate the preview output
				if ( 'url' === self.options.store ) {
					wp.media.ajax({
						type: 'POST',
						data: {
							action: 'get-attachment-by-url',
							url: val
						},
						success: function( attachment ) {
							self._createContent( attachment );
						},
						error: function() {
							self.element.val( null );
							self._resetContent();
						}
					});
				} else {
					wp.media.ajax({
						type: 'POST',
						data: {
							action: 'get-attachment',
							id: parseInt( val, 10 )
						},
						success: function( attachment ) {
							self._createContent( attachment );
						},
						error: function() {
							self.element.val( null );
							self._resetContent();
						}
					});
				}
			} else {
				// otherwise just generate the markup
				self.element.val( null );
				self._resetContent();
			}
		},

		sendAttachment: function( attachment ) {
			var self = this;

			if ( 'url' === self.options.store ) {
				self.element.val( attachment.url );
			} else {
				self.element.val( attachment.id );
			}

			var content = self._createContent( attachment, true );

			if ( 'function' === typeof self.options.change ) {
				self.options.change.call( self );
			}

			return content;
		},

		open: function() {
			wp.media.editor.open( this.content_id );
		},

		close: function() {
			this.workflow.close();
		},

		attachment: function( attachment ) {
			if ( 'undefined' === typeof attachment ) {
				return this.attachment;
			}

			if ( ! attachment ) {
				this.element.val( null );
				this._resetContent();
			} else {
				if ( 'url' === this.options.store ) {
					this.element.val( attachment.url );
				} else {
					this.element.val( attachment.id );
				}
				this._createContent( attachment );
			}
		},

		value: function( val ) {
			if ( 'undefined' === typeof val ) {
				if ( ! this.attachment ) {
					return '';
				}
				if ( 'url' === this.options.store ) {
					return this.attachment.url;
				} else {
					return this.attachment.id;
				}
			}

			this.element.val( val );
			this._updateContent();
		}
	};

	$.widget( 'wp.wpMediaPicker', MediaPicker );
}( jQuery, wp ) );
