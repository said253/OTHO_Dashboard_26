import { Download } from 'lucide-react';

export function ExportButton() {
  const copyShareLink = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert('✅ Share link copied to clipboard!\n\nYou can now paste and share this URL with anyone.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('✅ Share link copied to clipboard!');
    });
  };

  return (
    <button
      onClick={copyShareLink}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
    >
      <Download size={20} />
      Copy Share Link
    </button>
  );
}