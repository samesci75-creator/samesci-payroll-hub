import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Handles file downloads on both Web and Mobile (Capacitor)
 * @param blob The file content as a Blob
 * @param fileName The desired file name
 */
export const saveAndShareFile = async (blob: Blob, fileName: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Convert Blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Strip the data:application/...;base64, part
          resolve(base64data.split(',')[1]);
        };
      });
      reader.readAsDataURL(blob);
      const base64 = await base64Promise;

      // Write file to temporary directory
      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      // Share the file
      await Share.share({
        title: fileName,
        text: 'Export SAMES CI',
        url: result.uri,
        dialogTitle: 'Ouvrir l\'export',
      });
    } catch (error) {
      console.error('Error saving/sharing file:', error);
      alert('Erreur lors de l\'exportation sur mobile.');
    }
  } else {
    // Web implementation
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
};
