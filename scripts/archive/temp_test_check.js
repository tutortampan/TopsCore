
    window.activeKeyboardInput = null;
    document.addEventListener('DOMContentLoaded', () => {
      const keys = document.querySelectorAll('.vk-key');
      keys.forEach(key => {
        key.addEventListener('click', (e) => {
          e.preventDefault();
          if (!window.activeKeyboardInput) return;
          
          const val = key.getAttribute('data-key');
          const input = window.activeKeyboardInput;
          const start = input.selectionStart;
          const end = input.selectionEnd;
          
          if (val === 'Backspace') {
            if (start === end && start > 0) {
              input.value = input.value.substring(0, start - 1) + input.value.substring(end);
              input.selectionStart = input.selectionEnd = start - 1;
            } else if (start !== end) {
              input.value = input.value.substring(0, start) + input.value.substring(end);
              input.selectionStart = input.selectionEnd = start;
            }
          } else if (val === 'Enter') {
            input.value = input.value.substring(0, start) + '\n' + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + 1;
          } else if (val === 'Shift') {
            // Toggle shift state (basic implementation - could be enhanced to affect rendering)
            input.dataset.shift = input.dataset.shift === 'true' ? 'false' : 'true';
          } else {
            const isShift = input.dataset.shift === 'true';
            const charToInsert = isShift && val.length === 1 ? val.toUpperCase() : val;
            input.value = input.value.substring(0, start) + charToInsert + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + charToInsert.length;
            
            // Turn off shift after one character
            if(isShift) {
              input.dataset.shift = 'false';
            }
          }
          
          // trigger input event so state saves
          input.dispatchEvent(new Event('input'));
          input.focus();
        });
      });
      
      // Prevent keyboard clicks from taking focus away
      const vkContainer = document.getElementById('virtual-keyboard-container');
      if (vkContainer) {
        vkContainer.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });
      }
    });
  