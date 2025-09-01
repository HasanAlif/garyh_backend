import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: function() {
        // Text is required only if there are no images
        return !this.image || this.image.length === 0;
      },
    },
    image: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Add validation to ensure at least one of text or image is provided
messageSchema.pre('validate', function(next) {
  const hasText = this.text && this.text.trim() !== '';
  const hasImages = this.image && this.image.length > 0;
  
  if (!hasText && !hasImages) {
    const error = new Error('Either text or images must be provided');
    error.name = 'ValidationError';
    return next(error);
  }
  
  // If text is empty string but images exist, set text to a space
  if (!hasText && hasImages) {
    this.text = ' ';
  }
  
  next();
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
