# Modal System Documentation

This document describes the modal system implemented in the videe-fe project, which provides a flexible and reusable way to display modal dialogs throughout the application.

## Components

### 1. ModalProvider
The context provider that manages modal state. Must wrap your application or the part where you want to use modals.

### 2. Modal
The main modal component that renders the modal dialog. Should be placed once in your component tree.

### 3. ModalTrigger
A wrapper component that makes any child element clickable to open a modal.

### 4. useModal
A hook that provides access to modal state and functions.

### 5. useModalHelpers
A hook that provides helper functions for common modal patterns (confirm dialogs, alerts, etc.).

## Basic Setup

1. Wrap your app with `ModalProvider`:

```tsx
import { ModalProvider } from '../contexts/ModalContext';
import Modal from '../components/Modal';

function App() {
  return (
    <ModalProvider>
      <YourAppContent />
      <Modal />
    </ModalProvider>
  );
}
```

## Usage Examples

### 1. Using useModal Hook

```tsx
import { useModal } from '../contexts/ModalContext';

function MyComponent() {
  const { openModal } = useModal();

  const handleOpenModal = () => {
    openModal({
      id: 'my-modal',
      title: 'My Modal',
      content: <div>Modal content here</div>,
      size: 'md',
    });
  };

  return <button onClick={handleOpenModal}>Open Modal</button>;
}
```

### 2. Using ModalTrigger

```tsx
import ModalTrigger from '../components/ModalTrigger';

function MyComponent() {
  return (
    <ModalTrigger
      modalConfig={{
        id: 'trigger-modal',
        title: 'Modal Title',
        content: <div>Modal content</div>,
        size: 'lg',
      }}
    >
      <button>Click to open modal</button>
    </ModalTrigger>
  );
}
```

### 3. Using Helper Functions

```tsx
import { useModalHelpers } from '../hooks/useModalHelpers';

function MyComponent() {
  const { showConfirmModal, showAlertModal } = useModalHelpers();

  const handleDelete = () => {
    showConfirmModal(
      'Delete Item',
      'Are you sure you want to delete this item?',
      () => {
        // Handle confirmation
        console.log('Confirmed');
      },
      () => {
        // Handle cancellation
        console.log('Cancelled');
      }
    );
  };

  const handleSuccess = () => {
    showAlertModal(
      'Success!',
      'Operation completed successfully.',
      () => {
        console.log('Alert closed');
      }
    );
  };

  return (
    <div>
      <button onClick={handleDelete}>Delete</button>
      <button onClick={handleSuccess}>Show Success</button>
    </div>
  );
}
```

## Modal Configuration

The `ModalConfig` interface supports the following options:

```tsx
interface ModalConfig {
  id: string;                    // Unique identifier for the modal
  title?: string;                // Optional title displayed in header
  content: ReactNode;            // Modal content (React component)
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';  // Modal size
  closeOnOverlayClick?: boolean; // Whether clicking overlay closes modal
  showCloseButton?: boolean;     // Whether to show close button
  onClose?: () => void;          // Callback when modal closes
}
```

## Modal Sizes

- `sm`: Small modal (max-width: 28rem)
- `md`: Medium modal (max-width: 32rem) - default
- `lg`: Large modal (max-width: 42rem)
- `xl`: Extra large modal (max-width: 56rem)
- `full`: Full screen modal (95% of viewport)

## Features

- **Accessibility**: Proper ARIA attributes and keyboard navigation
- **Escape Key**: Press Escape to close modal
- **Overlay Click**: Click outside modal to close (configurable)
- **Body Scroll Lock**: Prevents background scrolling when modal is open
- **Smooth Animations**: CSS transitions for opening/closing
- **Responsive Design**: Works on all screen sizes
- **TypeScript Support**: Full type safety

## Best Practices

1. **Always provide unique IDs**: Each modal should have a unique identifier
2. **Use appropriate sizes**: Choose the right size for your content
3. **Handle callbacks**: Use `onClose` callback for cleanup when needed
4. **Accessibility**: Ensure modal content is accessible (proper headings, focus management)
5. **Performance**: Keep modal content lightweight for better performance

## Example: Complex Modal with Form

```tsx
import { useModal } from '../contexts/ModalContext';
import Button from '../components/Button';

function MyComponent() {
  const { openModal } = useModal();

  const handleOpenFormModal = () => {
    openModal({
      id: 'form-modal',
      title: 'Create New Video',
      size: 'lg',
      closeOnOverlayClick: false,
      content: (
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Video Title
            </label>
            <input
              type="text"
              className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded text-white"
              placeholder="Enter video title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Description
            </label>
            <textarea
              className="w-full p-2 bg-zinc-700 border border-zinc-600 rounded text-white"
              rows={3}
              placeholder="Enter description"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => console.log('Cancel')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => console.log('Save')}>
              Save
            </Button>
          </div>
        </form>
      ),
    });
  };

  return <Button onClick={handleOpenFormModal}>Create Video</Button>;
}
```

## Troubleshooting

### Modal not opening
- Ensure `ModalProvider` wraps your component
- Check that `Modal` component is rendered in the tree
- Verify the `id` is unique

### Modal not closing
- Check if `closeOnOverlayClick` is set to `false`
- Ensure `showCloseButton` is not `false`
- Verify the `onClose` callback is not preventing closure

### Styling issues
- Modal uses Tailwind CSS classes
- Ensure your Tailwind configuration includes the required classes
- Check for CSS conflicts with other components 