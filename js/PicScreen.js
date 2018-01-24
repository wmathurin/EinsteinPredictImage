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
    ActivityIndicator,
    Button,
    FlatList,
    Image,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { net } from 'react-native-force';
import { showImagePicker } from 'react-native-image-picker';

var createReactClass = require('create-react-class');

const formatProbability = (probability) => {
    return Math.floor(probability*100) + "%";
};

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

const getUserInfo = (callback) => {
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
};

const uploadPhoto = (localPhotoUrl, userId, callback) => {
    net.sendRequest('/services/data', '/v36.0/connect/user-profiles/' + userId + '/photo', 
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

};

const analyzePhoto = (classifier, imgurl, callback) => {
    net.sendRequest('/services/apexrest', '/einstein', 
                    (response) => {
                        callback(response);
                    },
                    (error) => {
                        console.log('Failed to analyze photo:' + error);
                    }, 
                    'GET', 
                    {'model': classifier, 'imgurl':imgurl}, 
                   );
};

const PicScreen = createReactClass({
    navigationOptions: {
        title: 'Photo Analyzer'
    },

    getInitialState() {
        return {
            photoUrl: null,
            classifier: 'GeneralImageClassifier',
            probabilities: []
        };
    },

    componentDidMount() {
        getUserInfo((userInfo) => {
            analyzePhoto(this.state.classifier, userInfo.photo.largePhotoUrl,
                         (probabilities) => {
                             this.setState({
                                 probabilities: probabilities,
                                 userId: userInfo.id,
                                 photoUrl: userInfo.photo.largePhotoUrl,
                                 photoVersionId: userInfo.photo.photoVersionId
                             });
                         });
        });
    },

    onChangePic() {
        pickPhoto((response) => {
            uploadPhoto(response.uri, this.state.userId, (response) => {
                analyzePhoto(this.state.classifier, response.largePhotoUrl,
                             (probabilities) => {
                                 this.setState({
                                     probabilities: probabilities,
                                     photoUrl: response.largePhotoUrl,
                                     photoVersionId: response.photoVersionId,
                                 });
                             });
            });
        });
    },

    onChangeClassifier(classifier) {
        analyzePhoto(classifier, this.state.photoUrl,
                     (probabilities) => {
                         this.setState({
                             classifier: classifier,
                             probabilities: probabilities
                         });
                     });
    },

    render() {
        return (
            <View style={styles.container}>
                { this.state.photoUrl ? <Image style={styles.photo} source={{uri: this.state.photoUrl}} /> : <ActivityIndicator size="large" color="#0000ff" /> }

                <Button onPress={this.onChangePic} title="Change"/>
                <View style={styles.row}>
                  <Button onPress={() => {this.onChangeClassifier("GeneralImageClassifier")}} title="General"/>
                  <Button onPress={() => {this.onChangeClassifier("FoodImageClassifier")}} title="Food"/>
                  <Button onPress={() => {this.onChangeClassifier("MultiLabelImageClassifier")}} title="Multi Label"/>
                  <Button onPress={() => {this.onChangeClassifier("SceneClassifier")}} title="Scene"/>
                </View>

                <FlatList
                  style={styles.list}
                  data={this.state.probabilities}
                  renderItem={ ({item}) => <View style={styles.row}><Text>{item.label}</Text><Text>{formatProbability(item.probability)}</Text></View> } />

            </View>
        );
    }
});

const styles = StyleSheet.create({
    container:{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    photo: {
        height:350,
        width:350,
    },
});

export default PicScreen;
