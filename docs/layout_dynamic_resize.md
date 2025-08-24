현재문제
- Timeline의 frame의 갯수에 맞춰서 가로길이는 고정으로 정해짐
- Project settings는 title 길이로 가로길이 고정
- Tools/Colors는 최소 가로길이가 없어 resize시 메뉴가 사라짐.
- Play button누르면 동적으로 움직이는 애니메이션 없음.
- Pause button 은 필요없음.

기대되는 동작
- Tools/Colors도 Project settings만큼 최소길이 유지
- Timeline의 최소길이는 현재 캔버스 사이즈에 맞추도록 설정
- Timeline에 안보이는 frame들은 좌우 횡 스크롤로 선택가능
- Timeline에 Play button 누르면 키보드를 300ms마다 오른쪽 키를 누르는 효과 적용. 유저가 어느위치든 마우스 클릭 이벤트를 발생시키거나, pause/stop 버튼을 누르면 중지.
- Pause와 Stop의 기능은 같아서 Pause button삭제 필요.