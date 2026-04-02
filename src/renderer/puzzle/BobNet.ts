import pako from 'pako';

export class BobNet {
  public static readonly endline = ":END:\r\n";
  public static readonly batch = ":BATCH:";

  public static debugMode = false;

  public static toBase64GZippedGSON(obj: any): string {
    try {
      const json = JSON.stringify(obj);
      const compressed = pako.gzip(json);
      return btoa(String.fromCharCode.apply(null, Array.from(compressed)));
    } catch (e) {
      console.error(e);
      return "";
    }
  }

  public static fromBase64GZippedGSON(b64: string): any {
    try {
      const binaryString = atob(b64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const uncompressed = pako.ungzip(bytes, { to: 'string' });
      return JSON.parse(uncompressed);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public static debugServerAddress = "localhost";
  public static releaseServerAddress = "server.bobsgame.com";
  public static serverTCPPort = 6065;

  public static clientUDPPortStartRange = 6435;

  public static debugSTUNServerAddress = "localhost";
  public static releaseSTUNServerAddress = "stun.bobsgame.com";
  public static STUNServerUDPPort = 6433;

  public static debugBigDataURL = "http://localhost/z/";
  public static releaseBigDataURL = "https://bobsgame.s3.amazonaws.com/z/";

  public static debugSmallDataURL = "http://localhost/assets/";
  public static releaseSmallDataURL = "http://bobsgame.com/assets/";

  public static debugINDEXServerAddress = "localhost";
  public static releaseINDEXServerAddress = "index.bobsgame.com";
  public static INDEXServerTCPPort = 606;

  public static readonly Server_IP_Address_Request = "Server_IP_Address_Request:";
  public static readonly Server_IP_Address_Response = "Server_IP_Address_Response:";

  public static readonly Login_Request = "Login_Request:";
  public static readonly Login_Response = "Login_Response:";

  public static readonly Reconnect_Request = "Reconnect_Request:";
  public static readonly Reconnect_Response = "Reconnect_Response:";

  public static readonly Facebook_Login_Request = "Facebook_Login_Request:";
  public static readonly Facebook_Login_Response = "Facebook_Login_Response:";

  public static readonly Password_Recovery_Request = "Password_Recovery_Request:";
  public static readonly Password_Recovery_Response = "Password_Recovery_Response:";

  public static readonly Create_Account_Request = "Create_Account_Request:";
  public static readonly Create_Account_Response = "Create_Account_Response:";

  public static readonly Initial_GameSave_Request = "Initial_GameSave_Request:";
  public static readonly Initial_GameSave_Response = "Initial_GameSave_Response:";

  public static readonly Encrypted_GameSave_Update_Request = "Encrypted_GameSave_Update_Request:";
  public static readonly Encrypted_GameSave_Update_Response = "Encrypted_GameSave_Update_Response:";

  public static readonly Postal_Code_Update_Request = "Postal_Code_Update_Request:";
  public static readonly Postal_Code_Update_Response = "Postal_Code_Update_Response:";

  public static readonly Player_Coords = "Player_Coords:";

  public static readonly Map_Request_By_Name = "Map_Request_By_Name:";
  public static readonly Map_Request_By_ID = "Map_Request_By_ID:";
  public static readonly Map_Response = "Map_Response:";

  public static readonly Sprite_Request_By_Name = "Sprite_Request_By_Name:";
  public static readonly Sprite_Request_By_ID = "Sprite_Request_By_ID:";
  public static readonly Sprite_Response = "Sprite_Response:";

  public static readonly Dialogue_Request = "Dialogue_Request:";
  public static readonly Dialogue_Response = "Dialogue_Response:";

  public static readonly Load_Event_Request = "Load_Event_Request:";
  public static readonly Load_Event_Response = "Load_Event_Response:";

  public static readonly Event_Request = "Event_Request:";
  public static readonly Event_Response = "Event_Response:";

  public static readonly GameString_Request = "GameString_Request:";
  public static readonly GameString_Response = "GameString_Response:";

  public static readonly Flag_Request = "Flag_Request:";
  public static readonly Flag_Response = "Flag_Response:";

  public static readonly Skill_Request = "Skill_Request:";
  public static readonly Skill_Response = "Skill_Response:";

  public static readonly Music_Request = "Music_Request:";
  public static readonly Music_Response = "Music_Response:";

  public static readonly Sound_Request = "Sound_Request:";
  public static readonly Sound_Response = "Sound_Response:";

  public static readonly Update_Facebook_Account_In_DB_Request = "Update_Facebook_Account_In_DB_Request:";
  public static readonly Update_Facebook_Account_In_DB_Response = "Update_Facebook_Account_In_DB_Response:";

  public static readonly Add_Friend_By_UserName_Request = "Add_Friend_By_UserName_Request:";
  public static readonly Add_Friend_By_UserName_Response = "Add_Friend_By_UserName_Response:";

  public static readonly Online_Friends_List_Request = "Online_Friends_List_Request:";
  public static readonly Online_Friends_List_Response = "Online_Friends_List_Response:";

  public static readonly Friend_Is_Online_Notification = "Friend_Is_Online_Notification:";

  public static readonly Tell_Client_Their_Session_Was_Logged_On_Somewhere_Else = "Tell_Client_Their_Session_Was_Logged_On_Somewhere_Else:";

  public static readonly Tell_Client_Servers_Are_Shutting_Down = "Tell_Client_Servers_Are_Shutting_Down:";
  public static readonly Tell_Client_Servers_Have_Shut_Down = "Tell_Client_Servers_Have_Shut_Down:";

  public static readonly STUN_Request = "STUN_Request:";
  public static readonly STUN_Response = "STUN_Response:";

  public static readonly Friend_Connect_Request = "Friend_Connect_Request:";
  public static readonly Friend_Connect_Response = "Friend_Connect_Response:";

  public static readonly Friend_Data_Request = "Friend_Data_Request:";
  public static readonly Friend_Data_Response = "Friend_Data_Response:";

  public static readonly Friend_LocationStatus_Update = "Friend_Location_Update:";

  public static readonly Game_Connect_Request = "Game_Connect_Request:";
  public static readonly Game_Connect_Response = "Game_Connect_Response:";

  public static readonly Game_Challenge_Request = "Game_Challenge_Request:";
  public static readonly Game_Challenge_Response = "Game_Challenge_Response:";

  public static readonly INDEX_Register_Server_With_INDEX_Request = "INDEX_Register_Server_With_INDEX_Request:";
  public static readonly INDEX_Tell_ServerID_To_Tell_UserID_That_UserIDs_Are_Online = "INDEX_Tell_ServerID_To_Tell_UserID_That_UserIDs_Are_Online:";
  public static readonly INDEX_Tell_All_Servers_To_Tell_FacebookIDs_That_UserID_Is_Online = "INDEX_Tell_All_Servers_To_Tell_FacebookIDs_That_UserID_Is_Online:";
  public static readonly INDEX_Tell_All_Servers_To_Tell_UserNames_That_UserID_Is_Online = "INDEX_Tell_All_Servers_To_Tell_UserNames_That_UserID_Is_Online:";
  public static readonly INDEX_UserID_Logged_On_This_Server_Log_Them_Off_Other_Servers = "INDEX_UserID_Logged_On_This_Server_Log_Them_Off_Other_Servers:";
  public static readonly INDEX_Tell_All_Servers_To_Send_Activity_Update_To_All_Clients = "INDEX_Tell_All_Servers_To_Send_Activity_Update_To_All_Clients:";
  public static readonly INDEX_Tell_All_Servers_To_Send_Chat_Message_To_All_Clients = "INDEX_Tell_All_Servers_To_Send_Chat_Message_To_All_Clients:";

  public static readonly INDEX_Tell_All_Servers_Bobs_Game_Hosting_Room_Update = "INDEX_Tell_All_Servers_Bobs_Game_Hosting_Room_Update:";
  public static readonly INDEX_Tell_All_Servers_Bobs_Game_Remove_Room = "INDEX_Tell_All_Servers_Bobs_Game_Remove_Room:";

  public static readonly Server_Register_Server_With_INDEX_Response = "Server_Registered_With_INDEX_Response:";
  public static readonly Server_Tell_All_FacebookIDs_That_UserID_Is_Online = "Server_Tell_All_FacebookIDs_That_UserID_Is_Online:";
  public static readonly Server_Tell_All_UserNames_That_UserID_Is_Online = "Server_Tell_All_UserNames_That_UserID_Is_Online:";
  public static readonly Server_Tell_UserID_That_UserIDs_Are_Online = "Server_Tell_UserID_That_UserIDs_Are_Online:";
  public static readonly Server_UserID_Logged_On_Other_Server_So_Log_Them_Off = "Server_UserID_Logged_On_Other_Server_So_Log_Them_Off:";
  public static readonly Server_Tell_All_Users_Servers_Are_Shutting_Down = "Server_Tell_All_Users_Servers_Are_Shutting_Down:";
  public static readonly Server_Tell_All_Users_Servers_Have_Shut_Down = "Server_Tell_All_Users_Servers_Have_Shut_Down:";

  public static readonly Server_Bobs_Game_Hosting_Room_Update = "Server_Bobs_Game_Hosting_Room_Update:";
  public static readonly Server_Bobs_Game_Remove_Room = "Server_Bobs_Game_Remove_Room:";

  public static readonly Server_Send_Activity_Update_To_All_Clients = "Server_Send_Activity_Update_To_All_Clients:";
  public static readonly Server_Send_Chat_Message_To_All_Clients = "Server_Send_Chat_Message_To_All_Clients:";

  public static readonly Bobs_Game_GameTypesAndSequences_Download_Request = "Bobs_Game_GameTypesAndSequences_Download_Request:";
  public static readonly Bobs_Game_GameTypesAndSequences_Download_Response = "Bobs_Game_GameTypesAndSequences_Download_Response:";

  public static readonly Bobs_Game_GameTypesAndSequences_Upload_Request = "Bobs_Game_GameTypesAndSequences_Upload_Request:";
  public static readonly Bobs_Game_GameTypesAndSequences_Upload_Response = "Bobs_Game_GameTypesAndSequences_Upload_Response:";

  public static readonly Bobs_Game_GameTypesAndSequences_Vote_Request = "Bobs_Game_GameTypesAndSequences_Vote_Request:";
  public static readonly Bobs_Game_GameTypesAndSequences_Vote_Response = "Bobs_Game_GameTypesAndSequences_Vote_Response:";

  public static readonly Bobs_Game_RoomList_Request = "Bobs_Game_RoomList_Request:";
  public static readonly Bobs_Game_RoomList_Response = "Bobs_Game_RoomList_Response:";
  public static readonly Bobs_Game_TellRoomHostToAddMyUserID = "Bobs_Game_TellRoomHostToAddMyUserID:";
  public static readonly Bobs_Game_NewRoomCreatedUpdate = "Bobs_Game_NewRoomCreatedUpdate:";

  public static readonly Bobs_Game_HostingPublicRoomUpdate = "Bobs_Game_HostingPublicRoomUpdate:";
  public static readonly Bobs_Game_HostingPublicRoomStarted = "Bobs_Game_HostingPublicRoomStarted:";
  public static readonly Bobs_Game_HostingPublicRoomCanceled = "Bobs_Game_HostingPublicRoomCanceled:";
  public static readonly Bobs_Game_HostingPublicRoomEnded = "Bobs_Game_HostingPublicRoomEnded:";

  public static readonly Bobs_Game_GameStats = "Bobs_Game_GameStats:";
  public static readonly Bobs_Game_GameStats_Response = "Bobs_Game_GameStats_Response:";

  public static readonly Bobs_Game_ActivityStream_Request = "Bobs_Game_ActivityStream_Request:";
  public static readonly Bobs_Game_ActivityStream_Response = "Bobs_Game_ActivityStream_Response:";
  public static readonly Bobs_Game_ActivityStream_Update = "Bobs_Game_ActivityStream_Update:";

  public static readonly Bobs_Game_GetTournamentBracketRequest = "Bobs_Game_GetTournamentBracketRequest:";
  public static readonly Bobs_Game_GetTournamentBracketResponse = "Bobs_Game_GetTournamentBracketResponse:";
  public static readonly Bobs_Game_UpdateTournamentMatchWinnerRequest = "Bobs_Game_UpdateTournamentMatchWinnerRequest:";

  public static readonly Bobs_Game_GetHighScoresAndLeaderboardsRequest = "Bobs_Game_GetHighScoresAndLeaderboardsRequest:";
  public static readonly Bobs_Game_UserStatsLeaderBoardsAndHighScoresBatched = "Bobs_Game_UserStatsLeaderBoardsAndHighScoresBatched:";
  public static readonly Bobs_Game_UserStatsForSpecificGameAndDifficulty = "Bobs_Game_UserStatsForSpecificGameAndDifficulty:";
  public static readonly Bobs_Game_LeaderBoardsByTotalTimePlayed = "Bobs_Game_LeaderBoardsByTotalTimePlayed:";
  public static readonly Bobs_Game_LeaderBoardsByTotalBlocksCleared = "Bobs_Game_LeaderBoardsByTotalBlocksCleared:";
  public static readonly Bobs_Game_LeaderBoardsByPlaneswalkerPoints = "Bobs_Game_LeaderBoardsByPlaneswalkerPoints:";
  public static readonly Bobs_Game_LeaderBoardsByEloScore = "Bobs_Game_LeaderBoardsByEloScore:";
  public static readonly Bobs_Game_HighScoreBoardsByTimeLasted = "Bobs_Game_HighScoreBoardsByTimeLasted:";
  public static readonly Bobs_Game_HighScoreBoardsByBlocksCleared = "Bobs_Game_HighScoreBoardsByBlocksCleared:";

  public static readonly Bobs_Game_Game_Stats_DB_Name = "bobsGameGameStats";
  public static readonly Bobs_Game_User_Stats_For_Specific_Game_And_Difficulty_DB_Name = "bobsGameUserStatsForSpecificGameAndDifficulty";
  public static readonly Bobs_Game_LeaderBoardsByEloScore_DB_Name = "bobsGameLeaderBoardsByEloScore";
  public static readonly Bobs_Game_LeaderBoardsByPlaneswalkerPoints_DB_Name = "bobsGameLeaderBoardsByPlaneswalkerPoints";
  public static readonly Bobs_Game_LeaderBoardsByTotalTimePlayed_DB_Name = "bobsGameLeaderBoardsByTotalTimePlayed";
  public static readonly Bobs_Game_LeaderBoardsByTotalBlocksCleared_DB_Name = "bobsGameLeaderBoardsByTotalBlocksCleared";
  public static readonly Bobs_Game_HighScoreBoardsByBlocksCleared_DB_Name = "bobsGameHighScoreBoardsByBlocksCleared";
  public static readonly Bobs_Game_HighScoreBoardsByTimeLasted_DB_Name = "bobsGameHighScoreBoardsByTimeLasted";
  public static readonly Bobs_Game_ActivityStream_DB_Name = "bobsGameActivityStream";

  public static readonly Chat_Message = "Chat_Message:";
  public static readonly Server_Stats_Request = "Server_Stats_Request:";
  public static readonly Server_Stats_Response = "Server_Stats_Response:";

  public static readonly Client_Location_Request = "Client_Location_Request:";
  public static readonly Client_Location_Response = "Client_Location_Response:";

  public static readonly Bobs_Game_Frame_Packet = "Bobs_Game_Frame_Packet:";
}
