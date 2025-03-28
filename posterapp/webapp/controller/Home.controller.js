sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/suite/ui/commons/imageeditor/ImageEditor",
    "sap/suite/ui/commons/library",
], function (Controller, JSONModel, Dialog, Button, ImageEditor,SuiteLibrary) {
    "use strict";
	var ImageEditorMode = SuiteLibrary.ImageEditorMode;
    return Controller.extend("com.sap.photoeditor.controller.Home", {
        onInit: function () {
            var aTemplates = [
                { name: "Demo", imageSrc: "../images/poc_image.png" },
                { name: "Vigyan Diwas", imageSrc: "../images/poster_app_image_2.png" }
            ];

            var oModel = new JSONModel({
                templates: aTemplates,
                selectedTemplate: "",
                uploadedImage: "",
                croppedImage: ""  // Store cropped image separately to avoid overriding
            });

            this.getView().setModel(oModel, "templateModel");
            var oModel = new sap.ui.model.json.JSONModel({
                userProfile: {
                    name: "",
                    designation: "",
                    facebook: "",
                    instagram: ""
                }
            });
        
            this.getView().setModel(oModel, "profileModel");
        
            // Load data from localStorage if available
            var storedUserData = localStorage.getItem("userProfile");
            if (storedUserData) {
                oModel.setProperty("/userProfile", JSON.parse(storedUserData));
            }
        },

        // When user selects a template
        onSelectTemplate: function (oEvent) {
            let numbers = oEvent.mParameters.listItem.sId.replace(/\D+/g, ' ').trim().split(' ').map(Number);
            var sImageSrc = oEvent.getSource().getItems()[numbers[0]].getContent()[0].getItems()[0].getSrc();
            this.getView().getModel("templateModel").setProperty("/selectedTemplate", sImageSrc);
        },

        // When user uploads an image
        onUploadImage: function (oEvent) {
            var oFile = oEvent.getParameter("files")[0];
            if (oFile) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var sImageData = e.target.result;
                    var oModel = this.getView().getModel("templateModel");
                    
                    oModel.setProperty("/uploadedImage", sImageData);
                    oModel.setProperty("/croppedImage", ""); // Reset cropped image to prevent conflicts
                    
                    this.getView().byId("previewImage").setSrc(sImageData);  // Ensure preview works
                }.bind(this);
                reader.readAsDataURL(oFile);
            }
        },

        // Open Crop Dialog
        onCrop: function () {
            var oModel = this.getView().getModel("templateModel");
            var sUploadedImage = oModel.getProperty("/uploadedImage");

            if (!sUploadedImage) {
                sap.m.MessageToast.show("Please upload an image first.");
                return;
            }

            if (!this.oCropDialog) {
                var that = this;

                this._oImageEditor = new ImageEditor({
                    src:sUploadedImage,
                    scaleCropArea: true,
                    imageLoaded: function () {  // ✅ Ensure zoomToFit is called only after image is loaded
                        that._oImageEditor.zoomToFit();
                        that._oImageEditor.setMode(ImageEditorMode.CropEllipse);
                        that._oImageEditor.setCropAreaByRatio(1, 1);
                    }
                });

                this.oCropDialog = new Dialog({
                    title: "Crop Image",
                    contentWidth: "700px",
                    contentHeight: "500px",
                    verticalScrolling: false,
                    content: [this._oImageEditor],
                    beginButton: new Button({
                        text: "Apply Crop",
                        type: "Emphasized",
                        press: function () {
                            that._oImageEditor.applyVisibleCrop();
                            var croppedImageSrc = that._oImageEditor.getImagePngDataURL();

                            // Store the cropped image separately, do not overwrite uploadedImage
                            oModel.setProperty("/croppedImage", croppedImageSrc);
                            that.getView().byId("previewImage").setSrc(croppedImageSrc);

                            that.oCropDialog.close();
                        }
                    }),
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            that.oCropDialog.close();
                        }
                    }),
                    afterOpen: function () {
                        that._oImageEditor.zoomToFit();
						that._oImageEditor.setMode(ImageEditorMode.CropEllipse);
						that._oImageEditor.setCropAreaByRatio(1, 1);
                    }
                });
            }

            this.oCropDialog.open();
        },

        // Generate and download the final image
        onDownloadImage: function () {
            var oModel = this.getView().getModel("templateModel");
            var profileModel = this.getView().getModel("profileModel");
            var sTemplateSrc = oModel.getProperty("/selectedTemplate");
            var sUploadedSrc = oModel.getProperty("/uploadedImage");
            var sCroppedSrc = oModel.getProperty("/croppedImage");

            // Use cropped image if available, otherwise use uploaded image
            var sFinalImageSrc = sCroppedSrc || sUploadedSrc;

            if (!sTemplateSrc || !sFinalImageSrc) {
                sap.m.MessageToast.show("Please select a template and upload an image first.");
                return;
            }

            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            var imgTemplate = new Image();
            var imgUser = new Image();

            imgTemplate.src = sTemplateSrc;
            imgUser.src = sFinalImageSrc;

            imgTemplate.onload = function () {
                canvas.width = imgTemplate.width;
                canvas.height = imgTemplate.height;
                ctx.drawImage(imgTemplate, 0, 0, canvas.width, canvas.height);

                imgUser.onload = function () {
                    ctx.drawImage(imgUser, 700, 600, 200, 200); // Position user image on template
                     // Get user profile details
            var userName = profileModel.getProperty("/userProfile/name") || "Hem Chand";
            var userDesignation = profileModel.getProperty("/userProfile/designation") || "BJP President";

            // Set font properties
            ctx.font = "bold 30px Arial";
            ctx.fillStyle = "#ffffff"; // White color
            ctx.textAlign = "center";

             // Add black shadow for visibility
             ctx.shadowColor = "black";
             ctx.shadowBlur = 5;
             ctx.shadowOffsetX = 2;
             ctx.shadowOffsetY = 2;

              // Position text at the bottom of the poster
            var textX = canvas.width / 2;
            var textY = canvas.height - 30; // 50px from bottom

             // Add Name and Designation
             ctx.fillText(userName, textX, textY - 30);
             ctx.fillText(userDesignation, textX, textY);

            // Remove shadow for cleaner download
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;


                    var link = document.createElement("a");
                    link.download = "custom_image.png";
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                };
            };
        },
         // Rotate Left
         onRotateLeft: function () {
            var oImageEditor = this.getView().byId("imageEditor");
            if (oImageEditor.isImageLoaded()) {  // ✅ Ensure image is loaded before rotating
                oImageEditor.rotate(-90);
            } else {
                sap.m.MessageToast.show("Please wait for the image to load before rotating.");
            }
        },

        // Rotate Right
        onRotateRight: function () {
            this.getView().byId("imageEditor").rotate(90);
        },

        // Reset Editor
        onResetEditor: function () {
            this.getView().byId("imageEditor").reset();
        },
        onProfilePress: function () {
            if (!this.byId("profileDialog")) {
                sap.ui.xmlfragment(this.getView().getId(), "com.sap.photoeditor.view.ProfileDialog", this);
            }
            this.byId("profileDialog").open();
        },
        
        onCloseProfile: function () {
            this.byId("profileDialog").close();
        },
        
        onSaveProfile: function () {
            var oModel = this.getView().getModel("profileModel");
            var oDialog = this.byId("profileDialog");
            var userData = {
                name: this.byId("userName").getValue(),
                designation: this.byId("userDesignation").getValue(),
                facebook: this.byId("facebookHandle").getValue(),
                instagram: this.byId("instagramHandle").getValue()
            };
        
            // Save to Model
            oModel.setProperty("/userProfile", userData);
        
            // Save to localStorage
            localStorage.setItem("userProfile", JSON.stringify(userData));
        
            sap.m.MessageToast.show("Profile saved successfully!");
            this.byId("profileDialog").close();
            oDialog.close();
        }
    });
});
