function getIframeDialog({ title, size, iconURL, iframeURL }) {
    const dialog = {
        ...(size !== null && { size }),
        ...(iconURL !== null && { iconURL }),
        ...title, iframeURL
    };

    return dialog;
}

function getCardDialog({ title, size, iconURL, card }){
    const dialog = {
        ...(size !== null && { size }),
        ...(iconURL !== null && { iconURL }),
        ...title, card
    };

    return dialog;
}

exports.getIframeDialog = getIframeDialog;
exports.getCardDialog = getCardDialog;