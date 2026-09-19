
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { Order, OrderStatus } from '../types';
import { TrendingUp, ShoppingBag, Truck, CheckCircle, AlertCircle } from 'lucide-react';

interface DashboardProps {
  orders: Order[];
}

const Dashboard: React.FC<DashboardProps> = ({ orders }) => {
  const stats = orders.reduce((acc, order) => {
    const saleTotal = order.items.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
    const costTotal = order.items.reduce((sum, item) => sum + (item.purchasePrice * item.quantity), 0);
    const factoryShipping = order.factoryShippingCost || 0;
    const customerShipping = order.shippingCost || 0;
    
    const revenue = saleTotal + customerShipping;
    
    acc.revenue += revenue;
    acc.cost += costTotal;
    acc.profit += (revenue - costTotal - factoryShipping);
    
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.PAID) acc.completed++;
    if (order.status === OrderStatus.PENDING) acc.pending++;
    if (order.status === OrderStatus.PROCESSING) acc.production++;
    if (order.status === OrderStatus.SHIPPING) acc.shipping++;
    
    return acc;
  }, { revenue: 0, cost: 0, profit: 0, completed: 0, pending: 0, production: 0, shipping: 0 });

  // Lấy 7 đơn hàng mới nhất và hiển thị theo trình tự thời gian từ trái sang phải
  const chartData = orders.slice(0, 7).reverse().map(o => {
    const saleTotal = o.items.reduce((sum, i) => sum + (i.salePrice * i.quantity), 0);
    const costTotal = o.items.reduce((sum, i) => sum + (i.purchasePrice * i.quantity), 0);
    const customerShipping = o.shippingCost || 0;
    const factoryShipping = o.factoryShippingCost || 0;
    const revenue = saleTotal + customerShipping;

    return {
      name: o.orderDate.split('T')[0],
      revenue: revenue,
      profit: revenue - costTotal - factoryShipping,
    };
  });

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value.toLocaleString()} đ</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Tổng doanh thu" value={stats.revenue} icon={TrendingUp} color="bg-blue-500" />
        <StatCard title="Tổng giá vốn" value={stats.cost} icon={ShoppingBag} color="bg-amber-500" />
        <StatCard title="Lợi nhuận gộp" value={stats.profit} icon={CheckCircle} color="bg-emerald-500" />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-500 text-white">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng số đơn hàng</p>
            <p className="text-2xl font-bold text-slate-800">{orders.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Chờ xử lý</p>
          <p className="text-2xl font-black text-amber-600 tabular-nums">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Đang sản xuất</p>
          <p className="text-2xl font-black text-blue-600 tabular-nums">{stats.production}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Đang giao hàng</p>
          <p className="text-2xl font-black text-indigo-600 tabular-nums">{stats.shipping}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Hoàn thành</p>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">{stats.completed}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Xu hướng doanh thu (7 đơn gần nhất)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Lợi nhuận chi tiết</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v/1000000}M`} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
