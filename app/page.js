"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Stack,
  Typography,
  Button,
  Modal,
  TextField,
  Paper,
} from "@mui/material";
import Image from "next/image";
import { firestore, storage } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { PhotoCamera } from "@mui/icons-material";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  borderRadius: 4,
  boxShadow: 24,
  p: 4,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

const itemBoxStyle = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "16px",
  bgcolor: "#f9f9f9",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  transition: "transform 0.2s ease-in-out, box-shadow 0.3s ease-in-out",
  "&:hover": {
    transform: "scale(1.03)",
    boxShadow: "0px 8px 20px rgba(0, 0, 0, 0.15)",
  },
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [open, setOpen] = useState(false);
  const [itemName, setItemName] = useState("");
  const [image, setImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const updateInventory = async () => {
    try {
      const snapshot = query(collection(firestore, "inventory"));
      const docs = await getDocs(snapshot);
      const inventoryList = [];
      docs.forEach((doc) => {
        inventoryList.push({ name: doc.id, ...doc.data() });
      });
      setInventory(inventoryList);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const addItem = async (item, image) => {
    try {
      const docRef = doc(collection(firestore, "inventory"), item);
      let imageUrl = "";

      if (image) {
        const imageRef = ref(storage, `inventory/${item}-${Date.now()}`);
        await uploadBytes(imageRef, image);
        imageUrl = await getDownloadURL(imageRef);
      }

      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        await setDoc(
          docRef,
          { quantity: quantity + 1, imageUrl },
          { merge: true }
        );
        console.log(`Updated quantity for item: ${item}`);
      } else {
        await setDoc(docRef, { quantity: 1, imageUrl });
        console.log(`Added new item: ${item}`);
      }
      await updateInventory();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const increaseQuantity = async (item) => {
    await addItem(item, null);
  };

  const decreaseQuantity = async (item) => {
    try {
      const docRef = doc(collection(firestore, "inventory"), item);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity > 1) {
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });
          console.log(`Decreased quantity for item: ${item}`);
        } else {
          await deleteDoc(docRef);
          console.log(`Deleted item: ${item}`);
        }
        await updateInventory();
      }
    } catch (error) {
      console.error("Error decreasing item quantity:", error);
    }
  };

  const removeItem = async (item) => {
    try {
      const docRef = doc(collection(firestore, "inventory"), item);
      await deleteDoc(docRef);
      console.log(`Removed item: ${item}`);
      await updateInventory();
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  useEffect(() => {
    updateInventory();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setItemName("");
    setImage(null);
  };

  const handleImageUpload = (event) => {
    if (event.target.files.length > 0) {
      setImage(event.target.files[0]);
    }
  };

  const filteredInventory = inventory.filter(({ name }) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      justifyContent="center"
      flexDirection="column"
      alignItems="center"
      gap={4}
      bgcolor="#f0f4f8"
      padding={4}>
      <Button
        variant="contained"
        color="primary"
        size="large"
        onClick={handleOpen}>
        Add New Item
      </Button>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description">
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h5" component="h2">
            Add Item
          </Typography>
          <Stack width="100%" direction="row" spacing={2}>
            <TextField
              id="outlined-basic"
              label="Item"
              variant="outlined"
              fullWidth
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                addItem(itemName, image);
                handleClose();
              }}>
              Add
            </Button>
          </Stack>
          <Stack direction="row" alignItems="center" gap={2} marginTop={2}>
            <Button variant="contained" component="label">
              Upload Image
              <input type="file" hidden onChange={handleImageUpload} />
            </Button>
            {image && <Typography variant="body2">{image.name}</Typography>}
          </Stack>
        </Box>
      </Modal>

      <Paper elevation={3} sx={{ width: "800px", padding: 3, borderRadius: 3 }}>
        <Box
          bgcolor="#1976d2"
          color="white"
          borderRadius="8px"
          padding="16px"
          marginBottom={3}
          display="flex"
          justifyContent="center">
          <Typography variant="h4" textAlign="center">
            Inventory Items
          </Typography>
        </Box>

        <TextField
          label="Search Items"
          variant="outlined"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ marginBottom: 4 }}
        />

        <Stack width="100%" height="300px" spacing={2} overflow="auto">
          {filteredInventory.map(({ name, quantity, imageUrl }) => (
            <Box key={name} sx={itemBoxStyle}>
              <Stack direction="row" alignItems="center" gap={2}>
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name}
                    width={50}
                    height={50}
                    style={{ borderRadius: "8px" }}
                  />
                ) : null}
                <Typography variant="h5" color="text.primary">
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </Typography>
              </Stack>
              <Typography variant="h6" color="text.secondary">
                Quantity: {quantity}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => increaseQuantity(name)}>
                  Increase
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => decreaseQuantity(name)}>
                  Decrease
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={() => removeItem(name)}>
                  Remove
                </Button>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
