/**
 * dialog.js — Simple custom confirm modal
 */

export function showConfirm(title, message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        
        // Create box
        const box = document.createElement('div');
        box.className = 'dialog-box';
        
        // Title
        const titleEl = document.createElement('div');
        titleEl.className = 'dialog-title';
        titleEl.textContent = title;
        
        // Message
        const msgEl = document.createElement('div');
        msgEl.className = 'dialog-message';
        msgEl.textContent = message;
        
        // Actions container
        const actions = document.createElement('div');
        actions.className = 'dialog-actions';
        
        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'winui-btn winui-btn-secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
            close();
            resolve(false);
        };
        
        // Confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.className = isDanger ? 'winui-btn winui-btn-danger' : 'winui-btn winui-btn-accent';
        confirmBtn.textContent = confirmText;
        confirmBtn.onclick = () => {
            close();
            resolve(true);
        };
        
        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);
        
        box.appendChild(titleEl);
        box.appendChild(msgEl);
        box.appendChild(actions);
        overlay.appendChild(box);
        
        document.body.appendChild(overlay);
        
        function close() {
            document.body.removeChild(overlay);
        }
    });
}
