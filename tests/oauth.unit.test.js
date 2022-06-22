const { getOAuthApp, checkAndRefreshAccessToken } = require('../src/lib/oauth');
const { AsanaUser } = require('../src/models/asanaUserModel');
const moment = require('moment');

describe('oauth', () => {
    test('check and refresh access token - accessToken updated', async () => {
        // Arrange
        const newAccessToken = 'newAccessToken';
        const newRefreshToken = 'newRefreshToken';

        const date = new Date();
        const previousDate = moment(date).add(-5, 'm').toDate();
        const previousDateString = previousDate.toISOString();
        const newDate = moment(date).add(5, 'm').toDate();
        const newDateString = newDate.toISOString();

        const asanaUser = await AsanaUser.create({
            id: 'asanaUserId',
            accessToken: 'accessToken',
            refreshToken: 'refreshToken',
            tokenExpiredAt: previousDateString
        });

        const oauthApp = getOAuthApp();
        const mockTokenRefreshFunction = jest.fn().mockReturnValue(
            {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                expires: newDateString
            }
        );
        oauthApp.createToken = jest.fn().mockReturnValue({
            refresh: mockTokenRefreshFunction
        });

        // Act
        await checkAndRefreshAccessToken(asanaUser);

        // Assert
        const updatedAsanaUser = await AsanaUser.findByPk('asanaUserId');
        expect(updatedAsanaUser.accessToken).toBe(newAccessToken);
        expect(updatedAsanaUser.refreshToken).toBe(newRefreshToken);
        expect(updatedAsanaUser.tokenExpiredAt.toISOString()).toBe(newDateString);

        // Clean up
        await updatedAsanaUser.destroy();
    });
});