import Swal from 'sweetalert2';

/**
 * Show an error message.
 * @param {string} message
 * @param {string} [title='Error']
 */
export function showError(message, title = 'Error') {
  return Swal.fire({
    icon: 'error',
    title: title || 'Error',
    text: message,
    confirmButtonColor: '#27374D',
  });
}

/**
 * Show a success message.
 * @param {string} message
 * @param {string} [title='Success']
 */
export function showSuccess(message, title = 'Success') {
  return Swal.fire({
    icon: 'success',
    title: title || 'Success',
    text: message,
    confirmButtonColor: '#27374D',
  });
}

/**
 * Show a confirmation dialog. Returns a promise that resolves to true if confirmed, false if cancelled.
 * @param {string} message
 * @param {string} [title='Confirm']
 * @param {string} [confirmText='Yes']
 * @param {string} [cancelText='Cancel']
 * @returns {Promise<boolean>}
 */
export function showConfirm(message, title = 'Confirm', confirmText = 'Yes', cancelText = 'Cancel') {
  return Swal.fire({
    title: title || 'Confirm',
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#27374D',
    cancelButtonColor: '#526D82',
  }).then((result) => !!result.isConfirmed);
}

export { Swal };
