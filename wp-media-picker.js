/*
 * WP Media Picker - version 0.7.0
 *
 * Felix Arntz <felix-arntz@leaves-and-love.net>
 */

( function( $, wp, _ ) {

	var Select;
	var MediaPickerFrame;
	var MediaPicker;

	if ( 'undefined' === typeof wp || 'undefined' === typeof wp.media ) {
		// if wp.media is not loaded, scaffold the jQuery plugin function and abort
		$.fn.wpMediaPicker = function() {
			return this;
		};

		console.error( 'WP Media not found' );
		return;
	}

	Select = wp.media.view.MediaFrame.Select;

	MediaPickerFrame = Select.extend({
		initialize: function() {
			_.defaults( this.options, {
				query: {},
				multiple: false,
				editable: true,
				filterable: 'all',
				searchable: true,
				displaySettings: false,
				displayUserSettings: false,
				editing: false,
				state: 'insert',
				metadata: {}
			});

			Select.prototype.initialize.apply( this, arguments );
		},

		createStates: function() {
			this.states.add([
				new wp.media.controller.Library({
					id: 'insert',
					title: this.options.title,
					selection: this.options.selection,
					priority: 20,
					toolbar: 'main-insert',
					filterable: this.options.filterable,
					searchable: this.options.searchable,
					library: wp.media.query( this.options.query ),
					multiple: this.options.multiple,
					editable: this.options.editable,
					displaySettings: this.options.displaySettings,
					displayUserSettings: this.options.displayUserSettings
				}),

				new wp.media.controller.EditImage({ model: this.options.editImage })
			]);
		},

		bindHandlers: function() {
			Select.prototype.bindHandlers.apply( this, arguments );

			this.on( 'toolbar:create:main-insert', this.createToolbar, this );

			this.on( 'content:render:edit-image', this.renderEditImageContent, this );
			this.on( 'toolbar:render:main-insert', this.renderMainInsertToolbar, this );
		},

		renderEditImageContent: function() {
			var view = new wp.media.view.EditImage({
				controller: this,
				model: this.state().get( 'image' )
			}).render();

			this.content.set( view );

			view.loadEditor();
		},

		renderMainInsertToolbar: function( view ) {
			var controller = this;

			view.set( 'insert', {
				style: 'primary',
				priority: 80,
				text: controller.options.buttonText,
				requires: { selection: true },
				click: function() {
					controller.close();
					controller.state().trigger( 'insert', controller.state().get( 'selection' ) ).reset();
				}
			});
		}
	});

	MediaPicker = {
		options: {
			store: 'id',
			query: {},
			multiple: false,
			filterable: 'all',
			searchable: true,
			editable:   false,
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

			self.element.hide().wrap( '<div class="wp-mediapicker-container" />' );

			self.wrap          = self.element.parent();
			self.open_button   = $( '<a class="wp-mediapicker-open-button button" />' ).insertAfter( self.element );
			self.remove_button = $( '<a class="wp-mediapicker-remove-button" />' ).insertAfter( self.open_button ).text( self.options.label_remove );
			self.content_wrap  = $( '<div class="wp-mediapicker-content-wrap" />' ).insertAfter( self.remove_button );
			self.content       = $( '<div class="wp-mediapicker-content" />' ).appendTo( self.content_wrap ).attr( 'id', self.content_id );

			self.frame = new MediaPickerFrame({
				title: self.options.label_modal,
				buttonText: self.options.label_button,
				frame: 'select',
				state: 'insert',
				selection: new wp.media.model.Selection( [], {
					multiple: self.options.multiple
				}),
				query: self.options.query,
				multiple: self.options.multiple,
				filterable: self.options.filterable,
				searchable: self.options.searchable,
				editable: self.options.editable
			});

			self._updateContent();

			self._addListeners();
		},

		_addListeners: function() {
			var self = this;

			self.frame.on( 'insert', function() {
				var attachment = {};

				_.extend( attachment, self.frame.state().get( 'selection' ).first().toJSON() );

				if ( 'url' === self.options.store ) {
					self.element.val( attachment.url );
				} else {
					self.element.val( attachment.id );
				}

				self._createContent( attachment );

				if ( 'function' === typeof self.options.change ) {
					self.options.change.call( self );
				}

				$( document ).trigger( 'wpMediaPicker.updateField', [ attachment, self ] );
			});

			self.open_button.on( 'click', function() {
				var selection = self.frame.state( 'insert' ).get( 'selection' );
				selection.reset( self.attachment ? [ self.attachment ] : [] );

				self.open();
			});

			self.remove_button.on( 'click', function() {
				self.element.val( null );

				self._resetContent();

				if ( 'function' === typeof self.options.clear ) {
					self.options.clear.call( self );
				}
			});
		},

		_createContent: function( attachment ) {
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

			self.content.show().html( preview_content );
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
			var requestData;

			if ( val ) {
				// if an attachment is set, make an AJAX call to get the attachment data and generate the preview output
				if ( 'url' === self.options.store ) {
					requestData = {
						action: 'get-attachment-by-url',
						url: val
					};
				} else {
					requestData = {
						action: 'get-attachment',
						id: parseInt( val, 10 )
					};
				}

				wp.media.ajax({
					type: 'POST',
					data: requestData,
					success: function( attachment ) {
						self._createContent( attachment );

						$( document ).trigger( 'wpMediaPicker.updateField', [ attachment, this ] );
					},
					error: function() {
						self.element.val( null );
						self._resetContent();

						$( document ).trigger( 'wpMediaPicker.updateField', [ undefined, this ] );
					}
				});
			} else {
				// otherwise just generate the markup
				self.element.val( null );
				self._resetContent();

				$( document ).trigger( 'wpMediaPicker.updateField', [ undefined, this ] );
			}
		},

		open: function() {
			wp.media.frame = this.frame;

			this.frame.open();
			this.frame.$el.find( '.media-frame-menu .media-menu-item.active' ).focus();
		},

		close: function() {
			this.frame.close();
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

			$( document ).trigger( 'wpMediaPicker.updateField', [ attachment, this ] );
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
		},

		frame: function() {
			return this.frame;
		}
	};

	$.widget( 'wp.wpMediaPicker', MediaPicker );
}( jQuery, wp, _ ) );
