// Nội dung demo — resort hư cấu. Ảnh: Unsplash (đã kiểm tra từng URL), panorama 360°: Poly Haven (CC0).
const U = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;
export const img = U;

export const HERO = {
  image: '1540541338287-41700207dee6',
  alt: 'Toàn cảnh khu nghỉ dưỡng nhiệt đới với hồ bơi uốn lượn, hàng dừa và biển xanh',
};

// anchor: toạ độ trong scene 3D (được scene gán lại theo vị trí công trình thật)
export const PLACES = [
  {
    id: 'overwater', kind: 'villa', num: '01',
    name: 'Villa Trên Mặt Nước', en: 'Overwater Pool Villa',
    tagline: 'Ngủ trên sóng, thức dậy giữa vịnh.',
    desc: 'Sáu villa nối với bờ bằng cầu gỗ lim dài 180 m. Sàn kính trong phòng khách nhìn thẳng xuống rạn san hô, hồ bơi tràn bờ hướng về phía hoàng hôn trên vịnh.',
    price: 12900000, unit: 'đêm',
    specs: [['Diện tích', '110 m²'], ['Sức chứa', '2 + 1 trẻ em'], ['Giường', '1 King'], ['Hướng', 'Biển 180°']],
    features: ['Hồ bơi riêng tràn bờ', 'Sàn kính nhìn san hô', 'Bồn tắm ngoài trời', 'Bữa sáng nổi trên hồ bơi', 'Quản gia 24/7', 'Cano đưa đón riêng'],
    gallery: [
      [U('1573843981267-be1999ff37cd'), 'Dãy villa trên cầu gỗ giữa vịnh'],
      [U('1514282401047-d79a71a590e8'), 'Nhìn từ trên cao vào buổi sáng'],
      [U('1540202404-a2f29016b523'), 'Lối đi gỗ từ bãi cát trắng'],
    ],
    interior: [
      [U('1602002418082-a4443e081dd1'), 'Phòng khách — cửa kính cong mở ra sàn gỗ và biển'],
      [U('1611892440504-42a792e24d32'), 'Phòng ngủ — gỗ teak, rèm lanh, cửa ra vườn'],
      [U('1694967456324-bf77c9975132'), 'Bồn tắm hoa cạnh hồ bơi riêng'],
    ],
    pano: { src: 'assets/pano/hotel_room.jpg', label: 'Phòng ngủ chính' },
  },
  {
    id: 'beach', kind: 'villa', num: '02',
    name: 'Villa Biển Hồ Bơi Riêng', en: 'Beachfront Pool Villa',
    tagline: 'Bước ra khỏi giường là chạm cát.',
    desc: 'Nằm sau hàng dừa trên 2 km bãi cát trắng, mỗi villa có sân vườn nhiệt đới, hồ bơi 30 m² và chòi nghỉ mái lá nhìn thẳng ra biển.',
    price: 9800000, unit: 'đêm',
    specs: [['Diện tích', '160 m²'], ['Sức chứa', '4 người'], ['Giường', '2 phòng ngủ'], ['Hướng', 'Bãi biển']],
    features: ['Hồ bơi 30 m²', 'Chòi mái lá riêng', 'Lối ra biển trực tiếp', 'Bếp nhỏ & quầy bar', 'Vòi sen ngoài trời', 'Phù hợp gia đình'],
    gallery: [
      [U('1602343168117-bb8ffe3e2e9f'), 'Villa trắng sau hồ bơi, nhìn ra đường chân trời'],
      [U('1566073771259-6a8506099945'), 'Hồ bơi và ghế tắm nắng lúc hoàng hôn'],
      [U('1499793983690-e29da59ef1c2'), 'Mái lá và hàng dừa sát mép nước'],
    ],
    interior: [
      [U('1560448204-e02f11c3d0e2'), 'Phòng khách sáng, cửa sổ nhìn ra biển'],
      [U('1618773928121-c32242e63f39'), 'Phòng ngủ chính với đèn ngủ ấm'],
      [U('1752769041878-f24e37fd6aea'), 'Phòng tắm gỗ và cây xanh'],
    ],
    pano: { src: 'assets/pano/lythwood_room.jpg', label: 'Phòng ngủ đôi' },
  },
  {
    id: 'hill', kind: 'villa', num: '03',
    name: 'Villa Đồi Hoàng Hôn', en: 'Sunset Hill Villa',
    tagline: 'Cả vịnh nằm gọn dưới chân bạn.',
    desc: 'Bốn villa tựa lưng vào sườn đồi ở độ cao 60 m. Hồ bơi vô cực như đổ thẳng xuống vịnh, nơi ngắm hoàng hôn đẹp nhất khu nghỉ.',
    price: 15500000, unit: 'đêm',
    specs: [['Diện tích', '220 m²'], ['Sức chứa', '4 + 2 trẻ em'], ['Giường', '2 phòng ngủ'], ['Hướng', 'Toàn cảnh vịnh']],
    features: ['Hồ bơi vô cực 40 m²', 'Sân thượng ngắm hoàng hôn', 'Phòng xông hơi riêng', 'Xe điện đưa đón', 'Rạp phim mini', 'Bữa tối riêng tại villa'],
    gallery: [
      [U('1520250497591-112f2f40a3f4'), 'Hồ bơi và các chòi mái lá giữa núi'],
      [U('1584132967334-10e028bd69f7'), 'Hồ bơi vô cực nhìn ra đại dương'],
      [U('1582719508461-905c673771fd'), 'Sàn gỗ và ghế tắm nắng bên mép hồ'],
    ],
    interior: [
      [U('1600607687939-ce8a6c25118c'), 'Phòng khách mở với vách gỗ và cửa kính lớn'],
      [U('1505693416388-ac5ce068fe85'), 'Phòng ngủ chính'],
      [U('1760564019103-81cd3c225cd1'), 'Bồn tắm đứng bên vách tường ấm'],
    ],
    pano: { src: 'assets/pano/lythwood_lounge.jpg', label: 'Phòng khách' },
  },
  {
    id: 'jungle', kind: 'villa', num: '04',
    name: 'Nhà Cây Rừng Nguyên Sinh', en: 'Jungle Canopy House',
    tagline: 'Tiếng chim gọi bạn dậy mỗi sáng.',
    desc: 'Hai ngôi nhà gỗ trên cột cao 8 m, lẩn giữa tán rừng nguyên sinh phía đông vịnh. Dành cho ai muốn tách hẳn khỏi thế giới.',
    price: 7600000, unit: 'đêm',
    specs: [['Diện tích', '85 m²'], ['Sức chứa', '2 người'], ['Giường', '1 Queen'], ['Hướng', 'Tán rừng']],
    features: ['Sàn ngắm sao', 'Võng lưới trên tán cây', 'Hồ ngâm đá tự nhiên', 'Tour rừng cùng kiểm lâm', 'Không TV — có sách', 'Bữa sáng giỏ mây'],
    gallery: [
      [U('1676794944553-399cade9cd39'), 'Nhà gỗ và đá giữa rừng'],
      [U('1721989519334-40923a0ee1c0'), 'Hồ bơi giữa lá chuối'],
      [U('1675657144361-98ae33e6b6f9'), 'Sàn gỗ nhìn xuống cánh đồng và rừng'],
    ],
    interior: [
      [U('1600210492486-724fe5c67fb0'), 'Phòng khách nhiều nắng và cây xanh'],
      [U('1631049307264-da0ec9d70304'), 'Phòng ngủ sáng, tối giản'],
    ],
    pano: { src: 'assets/pano/wooden_lounge.jpg', label: 'Phòng sinh hoạt gỗ' },
  },
  {
    id: 'dining', kind: 'facility', num: '05',
    name: 'Nhà Hàng Mây', en: 'Mây Restaurant',
    tagline: 'Hải sản sáng nay, bàn tối nay.',
    desc: 'Nhà rường mái ngói hai tầng ngay trên bãi cát. Thực đơn đổi theo mẻ lưới của làng chài bên kia vịnh, kết hợp rau từ vườn hữu cơ của khu nghỉ.',
    hours: '06:30 – 23:00',
    specs: [['Sức chứa', '120 khách'], ['Phong cách', 'Việt đương đại'], ['Giờ mở', '06:30 – 23:00'], ['Đặt bàn', 'Khuyến nghị']],
    features: ['Bữa tối trên cát', 'Lớp nấu ăn phở & bánh xèo', 'Hầm rượu 300 nhãn', 'Thực đơn chay riêng'],
    gallery: [
      [U('1517248135467-4c7edcad34c4'), 'Không gian nhà hàng'],
      [U('1414235077428-338989a2e8c0'), 'Món tối với ánh nến'],
    ],
    interior: [],
    cta: 'Đặt bàn',
  },
  {
    id: 'spa', kind: 'facility', num: '06',
    name: 'Lưu Vân Spa', en: 'Lưu Vân Spa',
    tagline: 'Thảo mộc vùng núi, đôi tay vùng biển.',
    desc: 'Năm chòi trị liệu bên con suối chảy từ núi xuống. Liệu trình dùng tinh dầu sả, gừng và muối biển Hòn Khói.',
    hours: '09:00 – 21:00',
    specs: [['Phòng trị liệu', '5 chòi'], ['Liệu trình', '60 – 180 phút'], ['Giờ mở', '09:00 – 21:00'], ['Đặt lịch', 'Trước 4 giờ']],
    features: ['Massage đá nóng', 'Tắm lá thuốc Dao Đỏ', 'Yoga bình minh', 'Xông hơi thảo mộc'],
    gallery: [
      [U('1544161515-4ab6ce6db874'), 'Massage tinh dầu'],
      [U('1540555700478-4be289fbecef'), 'Khăn, nến và tinh dầu'],
      [U('1544367567-0f2fcb009e0b'), 'Yoga bình minh trên mặt nước'],
    ],
    interior: [],
    cta: 'Đặt lịch',
  },
];

export const EXPERIENCES = [
  { title: 'Lặn ngắm san hô', meta: 'Hòn Mun · 20 phút cano', text: 'Khu bảo tồn biển với hơn 350 loài san hô, nước trong nhìn rõ tới 15 m.', img: '1528127269322-539801943592' },
  { title: 'Bữa tối trên cát', meta: 'Mỗi tối · tối đa 6 bàn', text: 'Bàn riêng dưới đèn lồng, hải sản nướng than hoa và tiếng sóng.', img: '1563354860-799d15199ac3' },
  { title: 'Ninh Bình & Tràng An', meta: 'Hành trình 2 ngày', text: 'Chuyến bay ngắn ra Bắc, ngồi đò giữa núi đá vôi và chùa cổ.', img: '1557750255-c76072a7aad1' },
  { title: 'Phố cổ Hội An', meta: 'Hành trình 1 ngày', text: 'Thả đèn hoa đăng trên sông Hoài, may áo dài trong 24 giờ.', img: '1652731011413-93d4c5aa5c7c' },
  { title: 'Ruộng bậc thang', meta: 'Mùa lúa chín tháng 9', text: 'Bay trực thăng ngắm những thửa ruộng vàng uốn theo sườn núi.', img: '1559628233-100c798642d4' },
];
