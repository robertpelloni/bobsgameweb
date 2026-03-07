export class BobNet {
  public static readonly endline = ":END:\r\n";
  public static readonly batch = ":BATCH:";

  public static debugMode = false;

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

  public static readonly STUN_Request = "STUN_Request:";
  public static readonly STUN_Response = "STUN_Response:";

  public static readonly Friend_Connect_Request = "Friend_Connect_Request:";
  public static readonly Friend_Connect_Response = "Friend_Connect_Response:";

  public static readonly Game_Connect_Request = "Game_Connect_Request:";
  public static readonly Game_Connect_Response = "Game_Connect_Response:";

  public static readonly Bobs_Game_Frame_Packet = "Bobs_Game_Frame_Packet:";
}
