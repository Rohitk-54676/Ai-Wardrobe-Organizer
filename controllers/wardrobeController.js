let wardrobe = []; // temporary storage

// ADD CLOTHES
export const addCloth = (req, res) => {
  const item = {
    id: Date.now(),
    type: req.body.type,
    color: req.body.color,
    image: req.body.image,
    occasion: req.body.occasion
  };

  wardrobe.push(item);
  res.json({ message: "Item added", item });
};

// GET ALL CLOTHES
export const getClothes = (req, res) => {
  res.json(wardrobe);
};

// DELETE CLOTHES
export const deleteCloth = (req, res) => {
  const id = parseInt(req.params.id);
  wardrobe = wardrobe.filter(item => item.id !== id);

  res.json({ message: "Item deleted" });
};