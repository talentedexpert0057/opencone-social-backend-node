const express = require('express');
const passport = require('passport');
const Chat = require('../../models/Chat');
const Contact = require('../../models/Contact');
const User = require('../../models/User');
const { SOCKET_RECEIVED_MESSAGE, SOCKET_ADD_CONTACT } = require('../../utils/event.types');
const isEmpty = require('../../validation/is-empty');
const router = express.Router();

module.exports = (getIOInstance) => {

    /**
     * Get Messages
     */
    router.get("/:receiverId",
    passport.authenticate('jwt', { session: false }),
    async (req, res) => {
        console.log("get Messages");
        const receiver = await User.findById(req.params.receiverId);
        const sentChats = await Chat.find({
            sender: req.user,
            receiver: receiver
        }).populate(["sender", "receiver"]);
        const receivedChats = await Chat.find({
            sender: receiver,
            receiver: req.user
        }).populate(["sender", "receiver"]);
        const totalChats = [
            ...sentChats,
            ...receivedChats
        ];
        totalChats.sort((prev, next) => prev.date - next.date);
        return res.json({
            receiver,
            messages: totalChats
        });
    })

    /**
     * Send Message
     */
     router.put("/:receiverId", 
     passport.authenticate('jwt', { session: false }), 
     async (req, res) => {
        const receiver = await User.findById(req.params.receiverId);
        const sentChats = await Chat.find({
            sender: req.user,
            receiver: receiver
        }).populate(["sender", "receiver"]);
        const receivedChats = await Chat.find({
            sender: receiver,
            receiver: req.user
        }).populate(["sender", "receiver"]);
        const totalChats = [
            ...sentChats,
            ...receivedChats
        ];
        totalChats.sort((prev, next) => prev.date - next.date);

        if (isEmpty(totalChats)) {
            const newContact = new Contact({
                receiver: req.user,
                user: receiver
            });
            await newContact.save();
            console.log("added new contact");
            getIOInstance().sockets.emit(SOCKET_ADD_CONTACT, newContact);
        }
        const newChat = new Chat({
            message: req.body.message,
            receiver,
            sender: req.user
        });

        await newChat.save();
        console.log("send message");
        getIOInstance().sockets.emit(SOCKET_RECEIVED_MESSAGE, newChat);
        return res.json(newChat);
    })

    return router;
}