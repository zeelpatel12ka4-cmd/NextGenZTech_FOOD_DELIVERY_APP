const express = require('express');
const router = express.Router();
const MenuItem = require('../models/MenuItem');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find({});
    // Format output to match existing frontend bindings (converting _id to id)
    const formatted = items.map(item => ({
      id: item._id,
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.imageUrl,
      category: item.category,
      is_veg: item.isVeg,
      is_available: item.isAvailable,
      customization_options: item.customizationOptions
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving menu items.' });
  }
});

// Create menu item (Admin & Manager only)
router.post('/', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  const { name, description, price, image_url, category, is_veg, is_available, customization_options } = req.body;

  if (!name || price == null || !category) {
    return res.status(400).json({ message: 'Name, price, and category are required.' });
  }

  try {
    const newItem = new MenuItem({
      name,
      description,
      price,
      imageUrl: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      category,
      isVeg: is_veg !== false,
      isAvailable: is_available !== false,
      customizationOptions: customization_options || []
    });

    await newItem.save();
    res.status(201).json({
      id: newItem._id,
      name: newItem.name,
      price: newItem.price,
      category: newItem.category
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating menu item.', error: error.message });
  }
});

// Edit menu item (Admin & Manager only)
router.put('/:id', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  const itemId = req.params.id;
  const { name, description, price, image_url, category, is_veg, is_available, customization_options } = req.body;

  try {
    const item = await MenuItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }

    if (name !== undefined) item.name = name;
    if (description !== undefined) item.description = description;
    if (price !== undefined) item.price = price;
    if (image_url !== undefined) item.imageUrl = image_url;
    if (category !== undefined) item.category = category;
    if (is_veg !== undefined) item.isVeg = is_veg;
    if (is_available !== undefined) item.isAvailable = is_available;
    if (customization_options !== undefined) item.customizationOptions = customization_options;

    await item.save();
    res.json({ message: 'Menu item updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating menu item.' });
  }
});

// Delete menu item (Admin & Manager only)
router.delete('/:id', authMiddleware, requireRole(['admin', 'manager']), async (req, res) => {
  const itemId = req.params.id;

  try {
    const item = await MenuItem.findByIdAndDelete(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.json({ message: 'Menu item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting menu item.' });
  }
});

module.exports = router;
