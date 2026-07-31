(function($){

  'use strict';

  $(function(){

    $('.fa-generated-form').each(function(){

      const $form = $(this);
      const formId = $form.data('id');
      const $template = $('#fa-template-' + formId);

      if(!$template.length){
        console.warn('Plantilla no encontrada:', formId);
        return;
      }

      let enviando = false;

      function capitalizeWords(str){
        return String(str || '')
          .toLowerCase()
          .replace(/\b([a-záéíóúñü])/gi, function(match){
            return match.toUpperCase();
          });
      }

      function escapeAttr(str){
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function parseAttrsFilter(value){
        const out = {};

        String(value || '')
          .split(',')
          .map(function(p){ return $.trim(p); })
          .filter(Boolean)
          .forEach(function(part){
            const eq = part.indexOf('=');
            if(eq === -1) return;

            const attr = part.slice(0, eq).trim();
            const src = part.slice(eq + 1).trim();

            if(attr && src) out[attr] = src;
          });

        return out;
      }

      function parseTag(tag){
        const raw = String(tag || '')
          .split('|')
          .map(function(p){ return $.trim(p); })
          .filter(Boolean);

        const id = raw.shift() || '';

        let component = '';
        let attrs = null;
        let wrap = '';
        const filters = [];

        raw.forEach(function(part){
          if(part.indexOf('component:') === 0){
            component = part.slice(10).trim();
          }
          else if(part.indexOf('attrs:') === 0){
            attrs = parseAttrsFilter(part.slice(6));
          }
          else if(part.indexOf('wrap:') === 0){
            wrap = part.slice(5).trim();
          }
          else{
            filters.push(part);
          }
        });

        return { id, component, attrs, wrap, filters };
      }

      function getRepeatEntries(id){
        const $repeat = $form.find('.fa-repeat[data-repeat="' + id + '"]');
        if(!$repeat.length) return null;

        const entries = [];

        $repeat.find('.fa-entry').each(function(){
          const $e = $(this);

          const label = ($e.find('.fa-label').val() || '').trim();
          const value = ($e.find('.fa-value').val() || '').trim();
          const cantidad = ($e.find('.fa-cantidad').val() || '').trim();
          const text = ($e.find('.fa-text').val() || '').trim();
          const extra = ($e.find('.fa-extra').val() || '').trim();

          if(!label && !value && !cantidad && !text && !extra) return;

          entries.push({
            label: label,
            value: value || label,
            cantidad: cantidad,
            text: text,
            extra: extra
          });
        });

        return entries;
      }

      function getFieldData(id, useLabel){
        const repeat = getRepeatEntries(id);
        if(repeat) return repeat;

        const $field = $form.find('#' + id);
        if(!$field.length) return '';

        const type = ($field.attr('type') || '').toLowerCase();
        const tag = ($field.prop('tagName') || '').toLowerCase();

        if(type === 'radio'){
          const name = $field.attr('name');
          const $checked = $form.find('[name="' + name + '"]:checked');

          if(!$checked.length) return '';

          if(useLabel){
            return $form.find('label[for="' + $checked.attr('id') + '"]').text().trim();
          }

          return $checked.val() || '';
        }

        if(type === 'checkbox'){
          const name = $field.attr('name');

          const $checked = name
            ? $form.find('input[name="' + name + '"]:checked')
            : $form.find('#' + id + ':checked');

          if(!$checked.length) return [];

          return $checked.map(function(){
            return {
              label: $form.find('label[for="' + this.id + '"]').text().trim(),
              value: $(this).val()
            };
          }).get();
        }

        if(tag === 'select'){
          return useLabel
            ? $field.find('option:selected').text().trim()
            : ($field.val() || '');
        }

        return $field.val() || '';
      }

      function applyFilters(value, filters){
        let result = value;

        filters.forEach(function(f){

          if(f === 'upper'){
            result = Array.isArray(result)
              ? result.map(function(v){ return String(v).toUpperCase(); })
              : String(result).toUpperCase();
          }

          if(f === 'lower'){
            result = Array.isArray(result)
              ? result.map(function(v){ return String(v).toLowerCase(); })
              : String(result).toLowerCase();
          }

          if(f === 'capitalizar'){
            result = Array.isArray(result)
              ? result.map(capitalizeWords)
              : capitalizeWords(result);
          }

          if(f === 'lines'){
            result = Array.isArray(result)
              ? result.join('\n')
              : String(result).split(',').join('\n');
          }

          if(f === 'comma'){
            result = Array.isArray(result)
              ? result.join(', ')
              : result;
          }

          if(f === 'br'){
            result = String(result).replace(/\r\n|\r|\n/g, '<br>');
          }

        });

        if(Array.isArray(result)){
          result = result.join(', ');
        }

        return String(result || '').trim();
      }

      function buildAttrs(item, map){
        const m = map || { item: 'label', cantidad: 'cantidad' };

        return Object.keys(m)
          .map(function(attr){
            const val = item[m[attr]];
            if(val == null || val === '') return '';
            return attr + '="' + escapeAttr(val) + '"';
          })
          .filter(Boolean)
          .join(' ');
      }

      function renderComponent(items, tag, attrs){
        return items.map(function(item){
          const at = buildAttrs(item, attrs);

          if(attrs && Object.keys(attrs).length === 0){
            return '<' + tag + '>' + escapeAttr(item.label || '') + '</' + tag + '>';
          }

          return '<' + tag + (at ? ' ' + at : '') + '></' + tag + '>';
        }).join('\n');
      }

      function renderWrap(items, wrap){
        return items.map(function(item){
          return wrap.replace(/\{(label|value|cantidad|text|extra)\}/g, function(_, key){
            return escapeAttr(item[key] || '');
          });
        }).join('\n');
      }

      function renderTemplate(){
        return $template.val().replace(/\{\{(.*?)\}\}/g, function(_, raw){

          const p = parseTag(raw);
          let value = getFieldData(p.id, p.filters.includes('label'));

          if(Array.isArray(value) && value.length && typeof value[0] === 'object'){

            if(p.component){
              return renderComponent(value, p.component, p.attrs);
            }

            if(p.wrap){
              return renderWrap(value, p.wrap);
            }

            return value.map(function(v){
              return v.label || v.value || '';
            }).join('\n');
          }

          if(Array.isArray(value)){
            value = value.join(', ');
          }

          return applyFilters(value, p.filters);
        }).trim();
      }

      function getSubject(){
        const field = $form.data('subject-field');

        if(field){
          const val = ($form.find('#' + field).val() || '').trim();
          if(val) return val;
        }

        return $form.data('titulo') || 'Nuevo tema';
      }

      function createEntry($repeat){
        const tpl = $repeat.find('template.fa-entry-template').html();
        return tpl ? $(tpl.trim()) : null;
      }

      $form.on('click', '.fa-add-entry', function(e){
        e.preventDefault();

        const target = $(this).data('target');
        const $repeat = $form.find('.fa-repeat[data-repeat="' + target + '"]');
        const $new = createEntry($repeat);

        if($new){
          $repeat.find('.fa-repeat-list').append($new);
        }
      });

      $form.on('click', '.fa-remove-entry', function(e){
        e.preventDefault();

        const $entry = $(this).closest('.fa-entry');
        const $repeat = $(this).closest('.fa-repeat');

        if($repeat.find('.fa-entry').length > 1){
          $entry.remove();
        } else {
          $entry.find('input, textarea, select').val('');
          $entry.find('input[type="checkbox"], input[type="radio"]').prop('checked', false);
        }
      });

      $form.on('submit', function(e){
        e.preventDefault();

        if(enviando) return;

        const message = renderTemplate();
        const subject = getSubject();
        const foro = parseInt($form.data('foro'), 10) || 1;

        if(!message){
          alert('Mensaje vacío');
          return;
        }

        enviando = true;

        $.post('/post', {
          f: foro,
          subject: subject,
          message: message,
          mode: 'newtopic',
          post: 1
        })
        .done(function(){
          alert('Publicado');

          if(window.self !== window.top){
            window.parent.location.reload();
          } else {
            location.href = '/f' + foro + '-';
          }
        })
        .fail(function(){
          enviando = false;
          alert('Error');
        });

      });

    });

  });

})(jQuery);
