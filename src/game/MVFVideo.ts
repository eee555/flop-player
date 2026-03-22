/*****************************************************************
 Original script by Maksim Bashov 2014-04-18.

 Modified during 2019-02 by Damien Moore. Add Time and Status to Clone
 0.97 videos and deactivated several sections of code written for earlier
 versions but using incorrect assumptions. Changed 3bvs calculation to
 truncate instead of round.

 Modified by Damien Moore 2020-01-26. Rewrote the readmvf() function to
 correctly parse earlier versions. Program can now parse 8 different video
 formats: 2007, 2006, 0.97, 0.97 Funny Mode, 0.97 Unknown Hack, 0.8 to 0.96,
 0.76, and 0.75 or earlier. Tidied up code and wrote comments. This is being
 released as Clone (MVF) RAW version 6.

 Modified by Enbin Hu (Flop) 2021-11-17. Rewrote with TypeScript.

 Note Clone 2007 (not this program) has a bug where the day sometimes does not
 save correctly resulting in a value of 00. Also, Clone 0.97 beta sometimes
 saves the time 0.01s different than the actual end time per last mouse event.
 *****************************************************************/


 
 import { BaseVideo, VideoEvent } from '@/game/BaseVideo'
 
 interface Event {
   time: number
   x: number
   y: number
   event: 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr' | 'mv' | 'sc' | 'mt'
 }
 
 export class MVFVideo extends BaseVideo {
   protected readonly mName = 'MVFVideo'
   protected mWidth: number
   protected mHeight: number
   protected mMines: number
   protected mMarks: boolean
   protected mLevel: number
   protected mBoard: number[]
   protected mPlayer: Uint8Array
   protected mEvents: VideoEvent[] = []
 
   // Mode
   private mode = 0
   // Level
   private level = 0
   // Width
   private w = 0
   // Height
   private h = 0
   // Mines
   private m = 0
   // Number of game events
   private size = 0
   // Stores board and mine locations
   private board: number[] = []
   // Questionmarks
   private qm = 0
   // Style
   private nf = 0
   // Player name
   private name: Uint8Array = new Uint8Array();
   // Game events
   private video: Event[] = []
   // Cell size used in mouse movement calculations
   private squareSize = 16
   
   constructor (data: ArrayBuffer) {
     super(data)
     this.mWidth = 0;
     this.mHeight = 0;
     this.mMines = 0;
     this.mMarks = false;
     this.mLevel = 0;
     this.mBoard = [];
     this.mPlayer = new Uint8Array();
   }
 
   
   async init(){
     // 解析 MVF 录像
     
     await this.readmvf();
     
     // 设置录像基本信息
     this.mWidth = this.w
     this.mHeight = this.h
     this.mMines = this.m
     this.mMarks = this.qm !== 0
     this.mLevel = this.level + 1
     this.mBoard = this.board
     
     // 设置玩家名称
     this.mPlayer = this.name
     // 设置录像事件
     // const eventNames: ('mv' | 'lc' | 'lr' | 'rc' | 'rr' | 'mc' | 'mr')[] = ['mv', 'lc', 'lr', 'rc', 'rr', 'mc', 'mr']
     
     for (let i = 0; i < this.video.length; ++i) {
       const e = this.video[i]
       // Mouse event
       
       if (e.event && e.x < this.squareSize * this.getWidth()) {
         this.mEvents.push({
           time: e.time,
           mouse: e.event,
           column: Math.floor(e.x / this.squareSize),
           row: Math.floor(e.y / this.squareSize),
           x: e.x / this.squareSize * 16,
           y: e.y / this.squareSize * 16
         })
       }
     }
   }
 
   /**
    * Function is used to read video data
    */
   private async readmvf () {
     // Initialise local variables
     let i, j;
 
     const ms = await import("ms-toollib");
 
     let aa = new ms.MvfVideo(this.mData, "");
     
     console.log(333);
     aa.parse();
     console.log(445);
     
     aa.analyse();
     console.log(556);
     this.w = aa.column;
     this.h = aa.row;
     this.m = aa.mine_num;
     this.squareSize = aa.pix_size;
     this.qm = 0;
     this.level = aa.level - 3;
     aa.current_time = 1e8;
     let game_board: Array<Array<number>> = aa.game_board;
     this.board = new Array(this.w * this.h).fill(0)
     let total_10 = 0; // 每扫开的格子数量，看是否等于雷数
     for(i = 0; i < this.h; i++){
       for(j = 0; j < this.w; j++){
         if (game_board[i][j] >= 10){
           this.board[i * this.w + j] = 1;
           total_10 += 1;
         }
       }
     }
     this.name = new TextEncoder().encode(aa.player_identifier)
     if(total_10 != this.m){
       this.error('不能播放没有扫完的录像。')
     }
    
     for (let e of aa.events) {
       if(!e.event.is_mouse()){
         continue;
       }
       const e_mouse = e.event.unwrap_mouse();
       
       this.video.push({
         time: Math.round((Math.max(e.time + aa.video_start_time, 0)) * 1000),
         x: e_mouse.x,
         y: e_mouse.y,
         event: e_mouse.mouse as "lc" | "rc" | "lr" | "rr" | "mc" | "mr" | "mv" | "sc" | "mt"
       })
     }
 
     return 1;
 
   }
 }
 
 
 
