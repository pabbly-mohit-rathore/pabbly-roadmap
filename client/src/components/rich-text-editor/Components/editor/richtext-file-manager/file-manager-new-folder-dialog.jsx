import { useRef, useState, useEffect } from 'react';

import { Divider } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import FileUploadKnowledgeSource from 'src/components/upload/custom-upload-file';

// ----------------------------------------------------------------------

export function RichTextFileManagerNewFolderDialog({
  open,
  onClose,
  onCreate,
  onUpdate,
  folderName,
  onChangeFolderName,
  onImageUploaded,
  title = 'Upload Image Files',
  ...other
}) {
  const [selectedFile, setSelectedFile] = useState(null);

  const fileUploadRef = useRef(null);

  const handleFileUpload = (file) => {
    setSelectedFile(file);
    // Additional processing as needed
    if (file) {
      console.log('Image file uploaded:', file.name);
    }
  };

  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setSelectedFile(null);
    }
  }, [open]);

  const handleUpload = () => {
    if (selectedFile && onImageUploaded) {
      // Create file reader to convert to data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = {
          name: selectedFile.name,
          src: e.target.result,
          size: selectedFile.size,
        };
        onImageUploaded(imageData);
      };
      reader.readAsDataURL(selectedFile);
    }
    onClose();
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose} {...other}>
      <DialogTitle sx={{ p: (theme) => theme.spacing(3, 3, 2, 3) }}> {title} </DialogTitle>
      <Divider sx={{ mb: 3 }} />
      <DialogContent dividers sx={{ pt: 1, pb: 0, border: 'none' }}>
        {(onCreate || onUpdate) && (
          <TextField
            fullWidth
            label="Folder name"
            value={folderName}
            onChange={onChangeFolderName}
            sx={{ mb: 3 }}
          />
        )}

        <FileUploadKnowledgeSource
          ref={fileUploadRef}
          selectedFile={selectedFile}
          onFileUpload={handleFileUpload}
          uploadInformation="Choose an image file or drag it here"
          allowedFileTypes={[
            '.webp',
            '.svg',
            '.jpg',
            '.jpeg',
            '.jfif',
            '.pjpeg',
            '.pjp',
            '.gif',
            '.avif',
            '.apng',
            '.png',
          ]}
          fileErrorMessage="Please upload only image files! Supported formats: .webp, .svg, .jpg, .jpeg, .jfif, .pjpeg, .pjp, .gif, .avif, .apng, .png"
        />
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={handleUpload} color="primary" disabled={!selectedFile}>
          Add Image
        </Button>
        <Button onClick={handleCancel} variant="outlined" color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
