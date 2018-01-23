/*
 * Copyright (c) 2016-present, salesforce.com, inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided
 * that the following conditions are met:
 *
 * Redistributions of source code must retain the above copyright notice, this list of conditions and the
 * following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice, this list of conditions and
 * the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * Neither the name of salesforce.com, inc. nor the names of its contributors may be used to endorse or
 * promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
 * PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import React from 'react';
import {
    Alert,
    Button,
    FlatList,
    Image,
    Picker,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableHighlight,
    View,
} from 'react-native';

import { net } from 'react-native-force';
import { showImagePicker } from 'react-native-image-picker';
// import LabelledBar from './LabelledBar';

var createReactClass = require('create-react-class');


const pickPhoto = (callback) => {
    const options = {
        cancelButtonTitle: 'Cancel',
        takePhotoButtonTitle: 'Take Photo...', 
        chooseFromLibraryButtonTitle: 'Choose from Library...', 
        cameraType: 'front', 
        mediaType: 'photo', 
        maxWidth: 200, 
        maxHeight: 200, 
        allowsEditing: true, 
        noData: true,
        storageOptions: { 
            skipBackup: true, 
            path: 'images' 
        }
    };

    console.log("Showing image picker" + showImagePicker);
    
    showImagePicker(options, (response) => {
        console.log('Response = ' +  response);

        if (response.didCancel) {
            console.log('User cancelled image picker');
        }
        else if (response.error) {
            console.log('ImagePicker Error: ' + response.error);
        }
        else if (response.customButton) {
            console.log('User tapped custom button: ' +  response.customButton);
        }
        else {
            callback(response);
        }
    });
};

const PicScreen = createReactClass({
    navigationOptions: {
        title: 'Photo Analyzer'
    },

    getInitialState() {
        return {
            refreshing: false,
            classifier: 'GeneralImageClassifier',
            probabilities: []
        };
    },

    onRefresh() {
        this.refreshUserInfo();
    },

    getUserInfo(callback) {
        net.sendRequest('/services/data', '/v36.0/chatter/users/me', 
            (response) => {
                callback(response);
            },
            (error) => {
                console.log('Failed to get user info:' + error);
            }, 
            'GET', 
            {}, 
            {'X-Connect-Bearer-Urls': 'true'}
        );
    },

    uploadPhoto(localPhotoUrl, callback) {
        net.sendRequest('/services/data', '/v36.0/connect/user-profiles/' + this.state.userId + '/photo', 
            (response) => {
                callback(response);
            },
            (error) => {
                console.log('Failed to upload user photo:' + error);
            }, 
            'POST', 
            {}, 
            {'X-Connect-Bearer-Urls': 'true'},
            {fileUpload: {fileUrl:localPhotoUrl, fileMimeType:'image/jpeg', fileName:'pic.jpg'}}
       );

    },

    componentDidMount() {
        this.refreshUserInfo();
    },

    refreshUserInfo() {
        this.setState({refreshing: true});
        this.getUserInfo((userInfo) => {
            this.setState({
                userId: userInfo.id,
                photoUrl: userInfo.photo.largePhotoUrl,
                photoVersionId: userInfo.photo.photoVersionId,
                refreshing: false
            });
        });
    },

    analyzePhoto(callback) {
        net.sendRequest('/services/apexrest', '/einstein', 
            (response) => {
                callback(response);
            },
            (error) => {
                console.log('Failed to analyze photo:' + error);
            }, 
            'GET', 
            {'model': this.state.classifier, 'imgurl':this.state.photoUrl}, 
        );
    },

    onChangePic() {
        pickPhoto((response) => {
            this.uploadPhoto(response.uri, (response) => {
                this.setState({
                    photoUrl: response.largePhotoUrl,
                    photoVersionId: response.photoVersionId
                });
            });
        });
    },

    onAnalyzePic() {
        this.analyzePhoto((probabilities) => {
            this.setState({probabilities: probabilities});
        });
    },

    render() {
        return (
            <View style={styles.container}>
            <ScrollView style={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={this.state.refreshing}
                        onRefresh={this.onRefresh}
                    />
                }
            >
                { this.state.photoUrl?<Image style={styles.photo} source={{uri: this.state.photoUrl}} />
                    :<Text>Loading</Text> }

                <Button onPress={this.onChangePic} title="Upload"/>

                <Picker
                 style={styles.picker}
                 selectedValue={this.state.classifier}
                 onValueChange={(itemValue, itemIndex) => this.setState({classifier: itemValue})}>
                  <Picker.Item label="General" value="GeneralImageClassifier" />
                  <Picker.Item label="Food" value="FoodImageClassifier" />
                  <Picker.Item label="Multi label" value="MultiLabelImageClassifier" />
                  <Picker.Item label="Scene" value="SceneClassifier" />
                </Picker>

                <Button onPress={this.onAnalyzePic} title="Analyze"/>

                <FlatList 
                  data={this.state.probabilities}
                  renderItem={ ({item}) => <Text>{item.label}: {item.probability}</Text> } />

            </ScrollView>
            </View>
        );
    }
});

const styles = StyleSheet.create({
    container:{
        flex: 1,
        paddingTop:100
    },
    content: {
        backgroundColor: 'red',
        flex: 1,
        flexDirection: 'column',
    },
    scroll: {
        flex: 1,
        flexDirection: 'column',
    },
    photo: {
        height:300,
        width:300,
    },
    picker: {
        backgroundColor: 'green'
    }
});

export default PicScreen;
