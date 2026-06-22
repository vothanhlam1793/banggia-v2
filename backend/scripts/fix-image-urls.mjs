// Fix image URLs: /uploads/... → /admin/uploads/...
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGODB_URI);

// Find all products that have images or imageUrl with old path
const products = await mongoose.connection.collection('products').find({
  $or: [
    { imageUrl: { $regex: '^/uploads/', $options: '' } },
    { images: { $elemMatch: { $regex: '^/uploads/' } } },
  ],
}).toArray();

console.log(`Found ${products.length} products with old image paths`);

let updated = 0;
for (const p of products) {
  const updates = {};
  
  if (p.imageUrl && p.imageUrl.startsWith('/uploads/')) {
    updates.imageUrl = '/admin' + p.imageUrl;
  }
  
  if (p.images && p.images.some(u => u.startsWith('/uploads/'))) {
    updates.images = p.images.map(u => u.startsWith('/uploads/') ? '/admin' + u : u);
  }
  
  if (Object.keys(updates).length > 0) {
    await mongoose.connection.collection('products').updateOne(
      { _id: p._id },
      { $set: updates }
    );
    updated++;
  }
}

console.log(`Updated ${updated} products`);

// Verify
const remaining = await mongoose.connection.collection('products').countDocuments({
  $or: [
    { imageUrl: { $regex: '^/uploads/', $options: '' } },
    { images: { $elemMatch: { $regex: '^/uploads/' } } },
  ],
});

console.log(`Remaining with old paths: ${remaining}`);
console.log('Done!');

await mongoose.disconnect();
