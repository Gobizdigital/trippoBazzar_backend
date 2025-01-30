const contactModel = require("../models/ContactModel");
const auth = require("../auth/AuthValidation");
require("dotenv").config();

const addContact = async (req, res) => {
  try {
    const savedcontact = await contactModel.create(req.body);
    if (savedcontact) {
      res.status(201).json({
        message: "contact Added Successfully",
        data: savedcontact,
      });
    } else {
      res.status(400).json({ message: "Incomplete contact Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getAllContacts = async (req, res) => {
  try {
    const contacts = await contactModel.find();
    if (contacts.length > 0) {
      res.status(200).json({
        message: "contacts retrieved successfully",
        data: contacts,
      });
    } else {
      res.status(404).json({ message: "No contacts found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching contacts",
      error: error.message,
    });
  }
};

const getContactById = async (req, res) => {
  try {
    const contactId = req.params.id;
    const contact = await contactModel.findById(contactId);

    if (contact) {
      res.status(200).json({
        message: "contact retrieved successfully",
        data: contact,
      });
    } else {
      res.status(404).json({ message: "contact not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching contact",
      error: error.message,
    });
  }
};

const updateContact = async (req, res) => {
  try {
    const contactId = req.params.id; // Get country ID from URL params
    const updateData = req.body; // Get the data to be updated from the request body

    const updatedcontact = await contactModel.findByIdAndUpdate(
      contactId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedcontact) {
      res.status(200).json({
        message: "contact updated successfully",
        data: updatedcontact,
      });
    } else {
      res.status(404).json({ message: "contact not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating contact",
      error: error.message,
    });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contactId = req.params.id; // Get country ID from URL params

    const updatedcontact = await contactModel.findByIdAndDelete(contactId);

    if (updatedcontact) {
      res.status(200).json({
        message: "contact Deleted successfully",
      });
    } else {
      res.status(404).json({ message: "contact not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in Deleting contact",
      error: error.message,
    });
  }
};

module.exports = {
  addContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
};
