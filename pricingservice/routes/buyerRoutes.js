import ProtectedRoute from "../ProtectedRoute";

import BuyerDashboard from "../BuyerDashboard";
import CartPage from "../CartPage";
import CheckoutPage from "../CheckoutPage";
import PaymentPage from "../PaymentPage";
import OrdersPage from "../OrdersPage";
import OrderDetailsPage from "../OrderDetailsPage";

const buyerRoutes = [
  {
    path: "/buyer-dashboard",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <BuyerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/cart",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <CartPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/checkout",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <CheckoutPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/payment",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <PaymentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <OrdersPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/orders/:orderId",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <OrderDetailsPage />
      </ProtectedRoute>
    ),
  },
];

export default buyerRoutes;